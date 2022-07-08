import { filesystem, system } from 'gluegun'

// import { promisify } from 'util'
// import { rmdir } from 'fs'

//import sinon from 'sinon'

const src = filesystem.path(__dirname, '..')

const cli = async (cmd) =>
  system.run(
    'node ' + filesystem.path(src, 'bin', 'migrate-consul') + ` ${cmd}`
  )

test('outputs version', async () => {
  const output = await cli('--version')
  expect(output).toContain('3.0.0')
}, 20000)

test('outputs help', async () => {
  const output = await cli('--help')
  expect(output).toContain('3.0.0')
}, 20000)

test('inits config and migrations', async () => {
  const output = await cli('init __tests__ migrations')
  expect(output).toContain('generated')
}, 20000)

test('creates a new migration', async () => {
  const output = await cli(
    'create unit_test --path __tests__ --key test_key --value "Im a test value"'
  )
  expect(output).toContain('Generated')
}, 20000)

test('stages migrations', async () => {
  const output = await cli('stage --path __tests__ ')
  expect(output).toContain('staged')
}, 20000)

test('shows status', async () => {
  const output = await cli('status --path __tests__ ')
  expect(output).toContain('PENDING')
}, 20000)

test('verifies migrations', async () => {
  const output = await cli('verify --diff chars --path __tests__')
  expect(output).toContain('verified')
}, 20000)

test('unstages', async () => {
  const output = await cli('unstage --pending --path __tests__ ')
  expect(output).toContain('unstaged')
}, 20000)

// const deleteDir = promisify(rmdir)
// afterAll(async () => {
//   await deleteDir(
//     '/media/disk2/Repos/CommonModules/BTIS.Consul/migrate-consul/__tests__/migrations',
//     { recursive: true }
//   )
//   await deleteDir(
//     '/media/disk2/Repos/CommonModules/BTIS.Consul/migrate-consul/__tests__/types',
//     { recursive: true }
//   )
// })
