@api_scan
Feature: Web API free of security vulnerabilities known to the Emissary

# Before hooks are run before Background

Background:
  Given a new Test Session based on each Build User supplied appScanner resourceObject
  And the Emissary sites tree is populated with each Build User supplied route of each appScanner resourceObject
  And the Emissary authentication is configured for the SUT
  And the API is spidered for each appScanner resourceObject

Scenario: The application should not contain vulnerabilities known to the Emissary that exceed the Build User defined threshold
  Given the active scanners are configured
  When the active scan is run
  Then the vulnerability count should not exceed the Build User defined threshold of vulnerabilities known to the Emissary

