// Originally created for gemeni.health
/* eslint-disable */
var HtmlParameter = Java.type('org.parosproxy.paros.network.HtmlParameter');
var COOKIE_TYPE = org.parosproxy.paros.network.HtmlParameter.Type.cookie;

function sendAndReceive(helper, url, accessToken) {
  var isSecondRequest = !!accessToken;
  var msg = helper.prepareMessage();
  var requestUri = new org.apache.commons.httpclient.URI(url, true);
  var requestHeader = new org.parosproxy.paros.network.HttpRequestHeader('GET', requestUri, 'HTTP/1.1');
  var cookie;
  var cookies;

  msg.setRequestHeader(requestHeader);

  if (isSecondRequest) { // Then it's the second request.
    cookie = new HtmlParameter(COOKIE_TYPE, 'access_token', accessToken);
    msg.getRequestHeader().setHeader('Cookie', 'access_token=' + accessToken);
    cookies = msg.getRequestHeader().getCookieParams();
    cookies.add(cookie);
    msg.getRequestHeader().setCookieParams(cookies);
    print('\nSecond auth request headers:\n');
    print(msg.getRequestHeader());
  }

  helper.sendAndReceive(msg);
  if (isSecondRequest) {
    print('\nSecond auth request response headers and body:\n');
    print(msg.getResponseHeader());
    print(msg.getResponseBody().toString());
  }

  return msg;
}

function getHeaderContent(helper, url) {
  var msg = sendAndReceive(helper, url);

  print('\n\n\nInitial auth request headers:\n');
  print(msg.getRequestHeader());

  var responseHeaders = msg.getResponseHeader();
  print('\nInitial auth request response headers:\n');
  print(responseHeaders);

  return responseHeaders.toString();
}

function extractInputHeaderValues(headers) {
  var nextMessageValues = {
    accessToken: headers.split('access_token=')[1].split(';')[0],
    location: headers.split('Location: ')[1].split('\r')[0]
  };
  return nextMessageValues;
}

// The authenticate function is called whenever ZAP requires to authenticate, for a Context for which this script
// was selected as the Authentication Method. The function should send any messages that are required to do the authentication
// and should return a message with an authenticated response so the calling method.
//
// NOTE: Any message sent in the function should be obtained using the 'helper.prepareMessage()' method.
//
// Parameters:
//   helper - a helper class providing useful methods: prepareMessage(), sendAndReceive(msg)
//   paramsValues - the values of the parameters configured in the Session Properties -> Authentication panel.
//     The paramsValues is a map, having as keys the parameters names (as returned by the getRequiredParamsNames()
//     and getOptionalParamsNames() functions below)
//   credentials - an object containing the credentials values, as configured in the Session Properties -> Users panel.
//     The credential values can be obtained via calls to the getParam(paramName) method. The param names are the ones
//     returned by the getCredentialsParamsNames() below
function authenticate(helper, paramsValues, credentials) {
  var link = paramsValues.get('Login_URL');
  var nextMessageValues = extractInputHeaderValues(getHeaderContent(helper, link));
  var msg = sendAndReceive(helper, nextMessageValues.location, nextMessageValues.accessToken);
  return msg;
}

function getRequiredParamsNames() {
  return ['Login_URL'];
}

function getOptionalParamsNames() {
  return [];
}

function getCredentialsParamsNames() {
  return [];
}
/* eslint-enable */
