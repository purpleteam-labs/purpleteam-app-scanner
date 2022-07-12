// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

// Originally created for gemeni.health
/* eslint-disable */

var HttpRequestHeader = Java.type("org.parosproxy.paros.network.HttpRequestHeader");
var HttpHeader = Java.type("org.parosproxy.paros.network.HttpHeader");
var URI = Java.type("org.apache.commons.httpclient.URI");
var ScriptVars = Java.type('org.zaproxy.zap.extension.script.ScriptVars');

function log(msg) {
    print('[' + this['zap.script.name'] + '] ' + msg);
}

function authenticate(helper, paramsValues, credentials) {
    log("Authenticating via JavaScript script...");

    var loginApiUrl = paramsValues.get('OAuthTokenUrl');
    var clientId = paramsValues.get('ClientId');
    var clientSecret = paramsValues.get('ClientSecret');

    var requestBody = 'grant_type=' + encodeURIComponent('client_credentials') +
        '&client_id=' + encodeURIComponent(clientId) +
        '&client_secret=' + encodeURIComponent(clientSecret);


    var msg = helper.prepareMessage();

    var requestUri = new URI(loginApiUrl, false);

    var requestHeader = new HttpRequestHeader(HttpRequestHeader.POST, requestUri, HttpHeader.HTTP10);
    requestHeader.setHeader("content-type", "application/x-www-form-urlencoded");
    requestHeader.setContentLength(requestBody.length);
    msg.setRequestHeader(requestHeader);
    msg.setRequestBody(requestBody);

    helper.sendAndReceive(msg);

    var parsedResponse = JSON.parse(msg.getResponseBody().toString());
    if (parsedResponse.error) {
        log('Authentication failure');
    }
    else {
        log('Authentication success.');
        ScriptVars.setGlobalVar("accessToken", parsedResponse.access_token)
    }

    return msg;
}

// This function is called during the script loading to obtain a list of the names of the required configuration parameters,
// that will be shown in the Session Properties -> Authentication panel for configuration. They can be used
// to input dynamic data into the script, from the user interface (e.g. a login URL, name of POST parameters etc.)
function getRequiredParamsNames() {
    return ['OAuthTokenUrl', 'ClientId', 'ClientSecret'];
}

// This function is called during the script loading to obtain a list of the names of the optional configuration parameters,
// that will be shown in the Session Properties -> Authentication panel for configuration. They can be used
// to input dynamic data into the script, from the user interface (e.g. a login URL, name of POST parameters etc.)
function getOptionalParamsNames() {
    return [];
}

// This function is called during the script loading to obtain a list of the names of the parameters that are required,
// as credentials, for each User configured corresponding to an Authentication using this script 
function getCredentialsParamsNames() {
    return [];
}

// This optional function is called during the script loading to obtain the logged in indicator.
// NOTE: although optional this function must be implemented along with the function getLoggedOutIndicator().
//function getLoggedInIndicator() {
//	return "LoggedInIndicator";
//}

// This optional function is called during the script loading to obtain the logged out indicator.
// NOTE: although optional this function must be implemented along with the function getLoggedInIndicator().
//function getLoggedOutIndicator() {
//	return "LoggedOutIndicator";
//}