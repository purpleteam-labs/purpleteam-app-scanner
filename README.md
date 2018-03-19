[![Known Vulnerabilities](https://snyk.io/test/github/binarymist/purpleteam-app-scanner/badge.svg?targetFile=package.json)](https://snyk.io/test/github/binarymist/purpleteam-app-scanner?targetFile=package.json)

## Currently in heavy development

### Real Test

1. Once cloned, from the terminal run:
  
  `npm install`
  
2. Once the system under test (SUT) is running and accessible, from the terminal run the zaproxy container:
  
  `docker run -p 8080:8080 -it owasp/zap2docker-stable zap.sh -daemon -port 8080 -host 0.0.0.0 -config api.addrs.addr(0).name=<app-scanner-interface> -config api.addrs.addr(1).name=<zaproxy-interface> -config api.addrs.addr(2).name=zap -config api.key=<zap-api-key>`
  
3. Test the security of the System Under Test (SUT):
  
  `npm run testsecurity`

### Exercising the `/test-route`

This currently just runs dummy cucumber tests

1. Start the API:
  
  In one terminal: `npm start`
  
2. Hit the route:
  
  In second terminal: `curl -X POST http://localhost:3000/test-route`

  This should give you back the test results, currently in JSON, and the first terminal should display the cucumber summary on each route request.