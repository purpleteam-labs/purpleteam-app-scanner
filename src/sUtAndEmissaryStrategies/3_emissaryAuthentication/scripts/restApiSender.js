// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

// Originally created for gemeni.health
/* eslint-disable */

function log(msg) {
    print('[' + this['zap.script.name'] + '] ' + msg);
}

var HttpSender = Java.type('org.parosproxy.paros.network.HttpSender');
var ScriptVars = Java.type('org.zaproxy.zap.extension.script.ScriptVars');
var HtmlParameter = Java.type('org.parosproxy.paros.network.HtmlParameter')
var debug = true;

function sendingRequest(msg, initiator, helper) {
    debug && log('sendingRequest. Initiator: ' + initiator);
    if (initiator === HttpSender.AUTHENTICATION_INITIATOR) {
        log("Zap is trying to authenticate");
        return msg;
    }

    var accessToken = ScriptVars.getGlobalVar("accessToken");
    if (!accessToken) {
        log('Zap has not yet stored the access token, so unable to add it as a header.');
        return msg;
    }
    log("Added authorization token " + accessToken.slice(0, 20) + " ... ");
    msg.getRequestHeader().setHeader('Authorization', 'Bearer ' + accessToken);
    return msg;
}

function responseReceived(msg, initiator, helper) {
}