FROM node:10-alpine

ARG LOCAL_USER_ID
ARG LOCAL_GROUP_ID

# Create an environment variable in our image for the non-root user we want to use.
# ENV user 1000
ENV user app_scanner
ENV group purpleteam
RUN echo user is: ${user}, LOCAL_USER_ID is: ${LOCAL_USER_ID}, group is: ${group}, LOCAL_GROUP_ID is: ${LOCAL_GROUP_ID}
# Remove git once zaproxy from package.json is in NPM
RUN apk add --no-cache zip git
# Following taken from: https://github.com/mhart/alpine-node/issues/48#issuecomment-430902787
RUN apk add --no-cache shadow && \
    if [ -z "`getent group $LOCAL_GROUP_ID`" ]; then \
      addgroup -S -g $LOCAL_GROUP_ID $group; \
    else \
      groupmod -n $group `getent group $LOCAL_GROUP_ID | cut -d: -f1`; \
    fi && \
    if [ -z "`getent passwd $LOCAL_USER_ID`" ]; then \
      adduser -S -u $LOCAL_USER_ID -G $group -s /bin/sh $user; \
    else \
      usermod -l $user -g $LOCAL_GROUP_ID -d /home/$user -m `getent passwd $LOCAL_USER_ID | cut -d: -f1`; \
    fi

# Useful for running commands as root in development
# RUN apk add --no-cache sudo && \
#     echo "$user ALL=(root) NOPASSWD:ALL" > /etc/sudoers.d/$user && \
#     chmod 0440 /etc/sudoers.d/$user

ENV workdir /usr/src/app/

# Home is required for npm install. System account with no ability to login to shell
# For standard node image:
#RUN useradd --create-home --system --shell /bin/false $user
# For node alpine:
# RUN addgroup -S $user && adduser -S -G $user $user
RUN mkdir -p $workdir

#RUN cat /etc/resolv.conf
#RUN echo "" > /etc/resolv.conf
#RUN cat /etc/resolv.conf
#RUN ping dl-cdn.alpinelinux.org

#RUN apk add --no-cache --virtual .gyp python make g++
#RUN apk add --no-cache --virtual .gyp python

WORKDIR $workdir
# For npm@5 or later, copy the automatically generated package-lock.json instead.
COPY package.json package-lock.json $workdir

# chown is required by npm install as a non-root user.
RUN chown $user:$group --recursive $workdir

# Required if posix needed, for winston-syslog-posix
#RUN apk add --no-cache --virtual .gyp python make g++

# Then all further actions including running the containers should
# be done under non-root user, unless root is actually required.
USER $user

RUN cd $workdir; npm install

# Required if posix needed, for winston-syslog-posix
#User root
#RUN apk del .gyp python make g++
#USER $user

COPY . $workdir

# Here I used to chown and chmod as shown here: http://f1.holisticinfosecforwebdevelopers.com/chap03.html#vps-countermeasures-docker-the-default-user-is-root
# Problem is, each of these commands creates another layer of all the files modified and thus adds over 100MB to the image: https://www.datawire.io/not-engineer-running-3-5gb-docker-images/

EXPOSE 3000

CMD ["npm", "start"]