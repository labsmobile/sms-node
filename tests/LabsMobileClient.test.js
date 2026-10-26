jest.mock('axios', () => ({ request: jest.fn() }))
jest.mock('winston', () => ({
  transports: { File: jest.fn() },
  format: { combine: jest.fn(), timestamp: jest.fn(), printf: jest.fn() },
  createLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn() }))
}))

const axios = require('axios')
const LabsMobileClient = require('../src/LabsMobileClient')
const TextMessage = require('../src/LabsMobileModelTextMessage')
const CountryPrice = require('../src/LabsMobileModelCountryPrice')
const ScheduledSendings = require('../src/LabsMobileModelScheduledSendings')
const HlrRequest = require('../src/LabsMobileModelHlrRequest')
const ParametersException = require('../src/Exception/ParametersException')
const RestException = require('../src/Exception/RestException')

const operations = [
  ['SMS', 'sendSms', () => new TextMessage(['34600000000'], 'Hello'), 'post', '/json/send',
    { recipient: [{ msisdn: '34600000000' }], message: 'Hello', log: '2' }, { code: '0' }],
  ['balance', 'getCredit', () => undefined, 'get', '/json/balance', undefined, { code: 0, credits: 10 }],
  ['prices', 'getpricesCountry', () => new CountryPrice(['CO', 'ES']), 'post', '/json/prices',
    { countries: ['CO', 'ES'] }, { CO: { credits: 1 }, ES: { credits: 2 } }],
  ['scheduled', 'scheduledSendings', () => new ScheduledSendings('abc', 'cancel'), 'post', '/json/scheduled',
    { subid: 'abc', cmd: 'cancel' }, { code: 0 }],
  ['HLR', 'hlrRequest', () => new HlrRequest('34600000000'), 'get', '/hlr/?numbers=34600000000',
    undefined, { result: 'ok', numbers: [] }]
]

beforeEach(() => {
  jest.clearAllMocks()
  axios.request.mockReset()
  axios.request.mockImplementation(() => { throw new Error('Unexpected HTTP request') })
})

test.each(operations)('%s sends the expected request and returns the API response', async (
  name, method, makeBody, httpMethod, path, payload, data
) => {
  axios.request.mockResolvedValueOnce({ data })
  const client = new LabsMobileClient('user', 'token')
  await expect(client[method](makeBody())).resolves.toEqual(data)
  expect(axios.request).toHaveBeenCalledTimes(1)
  const config = axios.request.mock.calls[0][0]
  expect(config.method).toBe(httpMethod)
  expect(config.url).toBe('https://api.labsmobile.com' + path)
  expect(config.headers).toEqual({
    'Content-Type': 'application/json',
    Authorization: 'Basic ' + Buffer.from('user:token').toString('base64')
  })
  expect(config.data).toEqual(payload)
})

describe.each(operations)('%s validates credentials', (name, method, makeBody) => {
  test.each([
    ['', 'token', 'Username'], ['user', '', 'Token'],
    [null, 'token', 'Username'], ['user', null, 'Token']
  ])('rejects missing credentials (%s, %s)', async (username, token, field) => {
    const client = new LabsMobileClient(username, token)
    const request = client[method](makeBody())
    await expect(request).rejects.toBeInstanceOf(ParametersException)
    await expect(request).rejects.toHaveProperty('message', 'Error: ' + field + ' is required')
    expect(axios.request).not.toHaveBeenCalled()
  })
})

test.each(operations.slice(0, 4))('%s propagates API error codes and messages', async (name, method, makeBody) => {
  axios.request.mockResolvedValueOnce({ data: { code: '30', message: 'Rejected' } })
  const request = new LabsMobileClient('user', 'token')[method](makeBody())
  await expect(request).rejects.toBeInstanceOf(RestException)
  await expect(request).rejects.toMatchObject({ message: 'Rejected', status: '30' })
})

test('SMS preserves optional parameters and always includes log', async () => {
  const body = new TextMessage(['34600000000', '34600000001'], 'Hello')
  const fields = {
    tpoa: 'LabsMobile', subid: 'abc', label: 'campaign', test: 1,
    ackurl: 'https://example.com/ack', shortlink: 1, clickurl: 'https://example.com/click',
    scheduled: '2026-12-01 10:00:00', long: 1, crt: 1, crtId: 'id', crtName: 'name',
    ucs2: 1, nofilter: 1, parameters: { name: 'Ana' }
  }
  Object.assign(body, fields)
  axios.request.mockResolvedValueOnce({ data: { code: '0' } })
  await new LabsMobileClient('user', 'token').sendSms(body)
  const { crtId, crtName, ...rest } = fields
  expect(axios.request.mock.calls[0][0].data).toEqual({
    recipient: [{ msisdn: '34600000000' }, { msisdn: '34600000001' }],
    message: 'Hello', ...rest, crt_id: crtId, crt_name: crtName, log: '2'
  })
})

test('HLR converts HTTP error responses to RestException', async () => {
  axios.request.mockRejectedValueOnce({ response: { status: 401, data: { error: 'invalidauth' } } })
  const request = new LabsMobileClient('user', 'token').hlrRequest(new HlrRequest('34600000000'))
  await expect(request).rejects.toBeInstanceOf(RestException)
  await expect(request).rejects.toMatchObject({ message: 'invalidauth', status: 401 })
})
