[![Known Vulnerabilities](https://snyk.io/test/github/binarymist/purpleteam-app-scanner/badge.svg?targetFile=package.json)](https://snyk.io/test/github/binarymist/purpleteam-app-scanner?targetFile=package.json)

Once cloned, from the terminal run:

`npm install`

Once the system under test (SUT) is running and accessible, from the terminal run the zapproxy container:

`docker run -p 8080:8080 -it owasp/zap2docker-stable zap.sh -daemon -port 8080 -host 0.0.0.0 -config api.addrs.addr(0).name=<app-scanner-interface> -config api.addrs.addr(1).name=<zaproxy-interface> -config api.addrs.addr(2).name=zap -config api.key=<zap-api-key>`

Test the security of the SUT. On the first run of the following terminal command, the test will fail and chromedriver will be installed and ready to go:

`npm run testsecurity`

