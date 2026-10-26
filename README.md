<p align="center">
  <img src="https://avatars.githubusercontent.com/u/152215067?s=200&v=4" height="80">
</p>

# LabsMobile-Node

![](https://img.shields.io/badge/version-1.0.1-blue.svg)

Send SMS messages through the LabsMobile platform and the node library.

## Documentation

- Labsmobile API documentation can be found [here][apidocs].

## Features

- Send SMS messages.
- Get account credits
- Get prices by country
- Manage scheduled sendings
- HLR Request (Check mobile)

## Requirements

- A user account with LabsMobile. Click on the link to create an account [here][signUp].
- This library supports node v16.19.0 and higher versions of node.

## Installation

To install the [labsmobile-sms][packages] library, it is recommended to use [npm][getnpm].

### Installation command

```
npm i labsmobile-sms
```

### Installation by modifying the package.json file

```
"dependencies": {
	"labsmobile-sms": "1.0.1"
}
```

## Development and CI

CI tests Node.js 22.23.4, 24.22.1 and 26.12.1, the patched versions from the
October 2026 Node.js security release. Use a patched runtime in your application
as well; updating this library does not update the Node.js executable.

```bash
npm ci
npm test
```

Tests mock Axios and logging. They require no credentials and send no SMS.
The committed package-lock.json keeps CI and Docker dependency installs reproducible.
GitHub Actions are pinned to full commit hashes.
SMS requests include `log: '1'` automatically.

Docker defaults to Node.js 24.22.1 and runs tests as a non-root user:

```bash
docker build --build-arg NODE_VERSION=24.22.1 -t sms-node-test .
docker run --rm --network none sms-node-test
```

Use `NODE_VERSION=22.23.4` or `NODE_VERSION=26.12.1` to test the other runtimes.

## Manual integration checks

`prueba.js` calls the real API using credentials from the environment. It is not part
of Jest or CI. Keep tokens out of source files and Git. The client may write request
information to `LabsMobile.log`, which is ignored by Git.

```bash
export LM_USER='your-account-email'
export LM_TOKEN='your-api-token'
export LM_PHONE='your-number-with-country-code'
node prueba.js saldo
node prueba.js precios
node prueba.js sms
```

`sms` uses simulated mode (`test=1`). `sms-real` sends an actual SMS and `hlr` performs
an actual HLR lookup; both can consume credits. To cancel a pending test sending,
set `LM_SUBID` and run `node prueba.js cancelar`. Wildcard cancellation is disabled.
Use `node prueba.js --help` for all options. A nonzero exit code indicates failure.

To use Docker without installing Node.js locally:

```bash
docker build --build-arg NODE_VERSION=24.22.1 -t sms-node-manual .
docker run --rm -e LM_USER -e LM_TOKEN -e LM_PHONE -e LM_SUBID -e LM_COUNTRIES -e LM_MESSAGE sms-node-manual node prueba.js saldo
```

Replace `saldo` with the desired operation. Use `NODE_VERSION=22.23.4` or
`NODE_VERSION=26.12.1` to use another patched runtime. Rebuild after editing the script.

## Examples of use cases

**Send SMS**

Here is an example of using the library to send a SMS:

```javascript
const LabsMobileClient = require("labsmobile-sms/src/LabsMobileClient");
const LabsMobileModelTextMessage = require("labsmobile-sms/src/LabsMobileModelTextMessage");
const ParametersException = require("labsmobile-sms/src/Exception/ParametersException");
const RestException = require("labsmobile-sms/src/Exception/RestException");

async function sendSms() {
  try {
    const username = "myusername";
    const token = "mytoken";
    const message = "Test SMS";
    const phone = ["34XXXXXXXXX"];
    const clientLabsMobile = new LabsMobileClient(username, token);
    const bodySms = new LabsMobileModelTextMessage(phone, message);
    const response = await clientLabsMobile.sendSms(bodySms);
    console.log(response);
  } catch (error) {
    if (error instanceof ParametersException) {
      console.log(error.message);
    } else if (error instanceof RestException) {
      console.log(`Error: ${error.status} - ${error.message}`);
    } else {
      throw new Error("Error: " + error);
    }
  }
}
```

**Get account credits**

Here is an example to learn credits for an existing account:

```javascript
const LabsMobileClient = require("labsmobile-sms/src/LabsMobileClient");
const ParametersException = require("labsmobile-sms/src/Exception/ParametersException");
const RestException = require("labsmobile-sms/src/Exception/RestException");

async function getCreditTest() {
  try {
    const username = "myusername";
    const token = "mytoken";
    const clientLabsMobile = new LabsMobileClient(username, token);
    const response = await clientLabsMobile.getCredit();
    console.log(response);
  } catch (error) {
    if (error instanceof ParametersException) {
      console.log(error.message);
    } else if (error instanceof RestException) {
      console.log(`Error: ${error.status} - ${error.message}`);
    } else {
      throw new Error("Error: " + error);
    }
  }
}
```

**Manage scheduled sendings**

Here is an example you can cancel or execute the scheduled sendings that are pending for execution:

```javascript
const LabsMobileClient = require("labsmobile-sms/src/LabsMobileClient");
const LabsMobileModelScheduledSendings = require("labsmobile-sms/src/LabsMobileModelScheduledSendings");
const ParametersException = require("labsmobile-sms/src/Exception/ParametersException");
const RestException = require("labsmobile-sms/src/Exception/RestException");

async function scheduledSendingsTest() {
  try {
    const username = "myusername";
    const token = "mytoken";
    const subid = "mysubid";
    const cmd = "XXXXXX"; // send or cancel
    const clientLabsMobile = new LabsMobileClient(username, token);
    const scheduledSendings = new LabsMobileModelScheduledSendings(subid, cmd);
    const response = await clientLabsMobile.scheduledSendings(
      scheduledSendings
    );
    console.log(response);
  } catch (error) {
    if (error instanceof ParametersException) {
      console.log(error.message);
    } else if (error instanceof RestException) {
      console.log(`Error: ${error.status} - ${error.message}`);
    } else {
      throw new Error("Error: " + error);
    }
  }
}
```

**Get prices by country**

Here is an example to know the credits that a single sending will take depending on the country of delivery:

```javascript
const LabsMobileClient = require("labsmobile-sms/src/LabsMobileClient");
const LabsMobileModelCountryPrice = require("labsmobile-sms/src/LabsMobileModelCountryPrice");
const ParametersException = require("labsmobile-sms/src/Exception/ParametersException");
const RestException = require("labsmobile-sms/src/Exception/RestException");

async function getpricesCountryTest() {
  try {
    const username = "myusername";
    const token = "mytoken";
    const countries = ["CO", "ES"];
    const clientLabsMobile = new LabsMobileClient(username, token);
    const countriesPrice = new LabsMobileModelCountryPrice(countries);
    const response = await clientLabsMobile.getpricesCountry(countriesPrice);
    console.log(response);
  } catch (error) {
    if (error instanceof ParametersException) {
      console.log(error.message);
    } else if (error instanceof RestException) {
      console.log(`Error: ${error.status} - ${error.message}`);
    } else {
      throw new Error("Error: " + error);
    }
  }
}
```

**HLR Request**

Here is an example queries the mobile phone status with the related information like current operator, format, active, ported information, subscription country, etc:

```javascript
const LabsMobileClient = require("labsmobile-sms/src/LabsMobileClient");
const LabsMobileModelHlrRequest = require("labsmobile-sms/src/LabsMobileModelHlrRequest");
const ParametersException = require("labsmobile-sms/src/Exception/ParametersException");
const RestException = require("labsmobile-sms/src/Exception/RestException");

async function hlrRequestTest() {
  try {
    const username = "myusername";
    const token = "mytoken";
    const numbers = [];
    const clientLabsMobile = new LabsMobileClient(username, token);
    const hlr = new LabsMobileModelHlrRequest(numbers);
    const response = await clientLabsMobile.hlrRequest(hlr);
    console.log(response);
  } catch (error) {
    if (error instanceof ParametersException) {
      console.log(error.message);
    } else if (error instanceof RestException) {
      console.log(`Error: ${error.status} - ${error.message}`);
    } else {
      throw new Error("Error: " + error);
    }
  }
}
```

## Help

If you have questions, you can contact us through the support chat or through the support email support@labsmobile.com.

[apidocs]: https://apidocs.labsmobile.com/
[signUp]: https://www.labsmobile.com/en/signup
[packages]: https://www.npmjs.com/package/labsmobile-sms
[getnpm]: https://docs.npmjs.com/downloading-and-installing-node-js-and-npm
