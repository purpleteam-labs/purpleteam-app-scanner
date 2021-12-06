// Initiators are listed here: https://github.com/zaproxy/zaproxy/blob/master/zap/src/main/java/org/parosproxy/paros/network/HttpSender.java
/* eslint-disable */
// Logging with the script name is super helpful!
function log(msg) {
  print('[' + this['zap.script.name'] + '] ' + msg);
}

// Control.getSingleton().getExtensionLoader().getExtension(ExtensionUserManagement.class);
var HttpSender    = Java.type('org.parosproxy.paros.network.HttpSender');
var ScriptVars    = Java.type('org.zaproxy.zap.extension.script.ScriptVars');
var HtmlParameter = Java.type('org.parosproxy.paros.network.HtmlParameter')
var COOKIE_TYPE   = org.parosproxy.paros.network.HtmlParameter.Type.cookie;
var debug = true;

function sendingRequest(msg, initiator, helper) {
  debug && log('sendingRequest. Initiator: ' + initiator);
  if (initiator === HttpSender.AUTHENTICATION_INITIATOR) {
    log("Zap is trying to authenticate");
    return msg;
  }

  var accessToken = ScriptVars.getGlobalVar("jwt-token");
  var csrfToken = ScriptVars.getGlobalVar("csrf-token");
  if (!accessToken) {
    log('Zap has not yet stored the access token, so unable to add it as a header.');
    return;
  }
  //var headers = msg.getRequestHeader();
  //var cookie = new HtmlParameter(COOKIE_TYPE, "token", token);
  //msg.getRequestHeader().getCookieParams().add(cookie);
  // For all non-authentication requests we want to include the authorization header
  log("Added authorization token " + accessToken.slice(0, 20) + " ... ");
  msg.getRequestHeader().setHeader('Authorization', 'Bearer ' + accessToken);
  log("Added csrf token " + csrfToken.slice(0, 20) + " ... "); // Without this we get bad request..?..
  msg.getRequestHeader().setHeader('x-xsrf-token', csrfToken);
  return msg;
}

function responseReceived(msg, initiator, helper) {
  debug && log('responseReceived. Initiator: ' + initiator);
  var resbody     = msg.getResponseBody().toString()
  var resheaders  = msg.getResponseHeader()

  if (initiator !== HttpSender.AUTHENTICATION_INITIATOR) {
    //var token = ScriptVars.getGlobalVar("jwt-token");
    //if (!token) {return;}

    //var headers = msg.getRequestHeader();
    //var cookies = headers.getCookieParams();
    //var cookie = new HtmlParameter(COOKIE_TYPE, "token", token);

    //if (cookies.contains(cookie)) {return;}
    //msg.getResponseHeader().setHeader('Set-Cookie', 'token=' + token + '; Path=/;');
    return;
  }

  log("Handling authentication response")
  if (resheaders.getStatusCode() > 299) {
    log("Zap authentication failed.")
    return;
  }

  // Is response JSON? @todo check content-type

  log('content-type header value: ' + resheaders.getHeader('content-type'));
  //if (resbody[0] !== '{') {
  if (!resheaders.hasContentType('application/json')) {
    log("authentication response was not JSON.")
    log('auth resp follows: ' + resbody);
    return;
  }
  try {
    var data = JSON.parse(resbody);
  } catch (e) {
    log("authentication response was unable to be parsed as JSON.")
    return;
  }

  // If auth request was not succesful move on
  if (!data['access_token']) {
    log("authentication response contained no access token.")
    return;
  }
  if (!data['x_xsrf_token']) {
    log("authentication response contained no xsrf token.")
    return;
  }
  
  // @todo abstract away to be configureable
  var accessToken = data["access_token"]
  log("Capturing access token for JWT and storing to Zap:\n" + accessToken)
  var csrfToken = data["x_xsrf_token"]
  log("Capturing csrf token and storing to Zap:\n" + csrfToken)
  ScriptVars.setGlobalVar("jwt-token", accessToken)
  ScriptVars.setGlobalVar("csrf-token", csrfToken)
  //msg.getResponseHeader().setHeader('Set-Cookie', 'token=' + token + '; Path=/;');
}
// The following was used to reset the globals during dev:
/*
var ScriptVars    = Java.type('org.zaproxy.zap.extension.script.ScriptVars');

print(ScriptVars.getGlobalVar("jwt-token"));
print();
print(ScriptVars.getGlobalVar("csrf-token"));

ScriptVars.setGlobalVar("jwt-token", null)
ScriptVars.setGlobalVar("csrf-token", null)
*/
/* eslint-enable */
