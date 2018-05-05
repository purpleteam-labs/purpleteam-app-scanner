@app_scan
Feature: Web application free of security vulnerabilities known to Zap

# Before hooks are run befroe Background

Background:
  Given a new test session based on each build user supplied testSession
  And each build user supplied route of each testSession is navigated
  And a new scanning session based on each build user supplied testSession
  And each build user supplied route of each testSession is spidered
  And all scanners are disabled

Scenario: The application should not contain any vulnerabilities known to Zap
  Given the following scanners are enabled
    |               scanner name                   | scanner id |
    | Path Traversal                               | 6          |
    | Remote File Inclusion                        | 7          |
    | Server Side Include                          | 40009      |
    | Cross Site Scripting (Reflected)             | 40012      |
    | Cross Site Scripting (Persistent)            | 40014      |
    | SQL Injection                                | 40018      |
    | Server Side Code Injection                   | 90019      |
    | Remote OS Command Injection                  | 90020      |
    | Directory Browsing                           | 0          |
    | External Redirect                            | 20019      |
    | Buffer Overflow                              | 30001      |
    | Format String Error                          | 30002      |
    | CRLF Injection                               | 40003      |
    | Parameter Tampering                          | 40008      |
    | Cross Site Scripting (Persistent) - Prime    | 40016      |
    | Cross Site Scripting (Persistent) - Spider   | 40017      |
    | Script Active Scan Rules                     | 50000      |
    | Source Code Disclosure - SVN                 | 42         |
    | Source Code Disclosure - /WEB-INF folder     | 10045      |
    | Source Code Disclosure - CVE-2012-1823       | 20017      |
    | Remote Code Execution - Shell Shock          | 10048      |
    | Remote Code Execution - CVE-2012-1823        | 20018      |
    | LDAP Injection                               | 40015      |
    | XPath Injection                              | 90021      |
    | XML External Entity Attack                   | 90023      |
    | Generic Padding Oracle                       | 90024      |
    | Expression Language Injection                | 90025      |
    | Insecure HTTP Method                         | 90028      |
    | HTTP Parameter Pollution scanner             | 20014      |
    | Anti CSRF Tokens Scanner                     | 20012      |
    | Heartbleed OpenSSL Vulnerability             | 20015      |
    | Cross-Domain Misconfiguration                | 20016      |
    | Remote Code Execution - CVE-2012-1823        | 20018      |
    | Session Fixation                             | 40013      |
    | SQL Injection - MySQL                        | 40019      |
    | SQL Injection - Hypersonic SQL               | 40020      |
    | SQL Injection - Oracle                       | 40021      |
    | SQL Injection - PostgreSQL                   | 40022      |
    | XPath Injection                              | 90021      |
    | XML External Entity Attack                   | 90023      |
    | Generic Padding Oracle                       | 90024      |
    | Expression Language Injection                | 90025      |
    | Backup File Disclosure                       | 10095      |
    | Integer Overflow Error                       | 30003      |
    | Insecure HTTP Method                         | 90028      |
    | HTTP Parameter Pollution scanner             | 20014      |
    | Possible Username Enumeration                | 40023      |
    | SOAP Action Spoofing                         | 90026      |
    | SOAP XML Injection                           | 90029      |
  When the active scanner is run
  Then the vulnerability count should not exceed the build user decided threshold of vulnerabilities known to Zap
  And the Zap report is written to file
  