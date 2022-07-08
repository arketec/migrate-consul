/* eslint-disable @typescript-eslint/no-unused-vars */
import { Backup, Migration } from '../src/data'

import { ActionBackup } from './../src/actions/utility/ActionBackup'
import { ActionCreate } from './../src/actions/migration/ActionCreate'
import { IRepo } from './../src/data/types/interfaces'

const loggerMock = {
  info: (msg: string) => console.log(msg),
  error: (msg: string) => console.log(msg),
  debug: (msg: string, title?: string) => {
    console.log(title)
    console.log(msg)
  },
}
const mockConfig = `{
    // configure mongodb
    "database": {
      "host": "localhost",
      "port": "27017",
      "dbname": "consul_migrations"
    },
  
    // configure consul agent
    "consul": {
      "host": "localhost",
      "port": "8500",
      "secure": false,
      "acl": false,
      "aclTokenEnvVar": "CONSUL_HTTP_TOKEN"
    },
    // configure script generation options
    "generation": {
      "printExamples": true,
      "generateTypesFromKeys": false,
      "includeTypes": true
    },
    "diff": {
      "maxDiffLength": 10000,
      "colors": {
        "bg": "bgCyan",
        "added": "green",
        "removed": "red",
        "unchanged": "grey"
      }
    },
    // environment config
    "migrationsDirectory": "migrations",
    "environment": "local",
    "debug": false
  }
  `
const filesystemMock = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  readAsync: (_: string) => Promise.resolve(mockConfig),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  read: (_: string) => mockConfig,
}
const mockRepo: IRepo = {
  save(migration: Migration): Promise<void> {
    return Promise.resolve(console.log(migration))
  },
  get(name: string): Promise<Migration> {
    return Promise.resolve({
      name: 'test',
      date_added: new Date(),
      date_applied: new Date(),
      date_last_changed: new Date(),
      status: 0,
      script_author: '',
      changed_by: '',
    })
  },
  getAll(): Promise<Migration[]> {
    return Promise.resolve([
      {
        name: 'test',
        date_added: new Date(),
        date_applied: new Date(),
        date_last_changed: new Date(),
        status: 0,
        script_author: '',
        changed_by: '',
      },
    ])
  },
  find(status: number): Promise<Migration[]> {
    return Promise.resolve([
      {
        name: 'test',
        date_added: new Date(),
        date_applied: new Date(),
        date_last_changed: new Date(),
        status: 0,
        script_author: '',
        changed_by: '',
      },
    ])
  },
  findByAuthor(name: string): Promise<Migration[]> {
    return Promise.resolve([
      {
        name: 'test',
        date_added: new Date(),
        date_applied: new Date(),
        date_last_changed: new Date(),
        status: 0,
        script_author: '',
        changed_by: '',
      },
    ])
  },
  delete(name: string): Promise<void> {
    return Promise.resolve(console.log(name))
  },
  backup(key: string, value: string): Promise<void> {
    return Promise.resolve(console.log(key, value))
  },
  findBackups(key: string): Promise<Backup[]> {
    return Promise.resolve([
      {
        key: 'test',
        value: 'foo',
        date: new Date(),
      },
    ])
  },
  restore(key: string, date?: Date): Promise<string> {
    return Promise.resolve(key)
  },
}
const options = { path: '__tests__' }
test('test backup mock', async () => {
  const parameters = {
    first: 'Common/Promotions/appetite',
    options,
  }
  const action = new ActionBackup(loggerMock, undefined, mockRepo)
  action.appRoot = process.cwd()

  action.handleCommonOptions(parameters)
  await action.loadConfig(filesystemMock)
  action.setParameters(parameters)
  await action.exec(false)
})
test('test create mock', async () => {
  const parameters = {
    first: 'sample_desc',
    options: {
      import: true,
      key: 'Common/Promotions/appetite',
      ...options,
    },
  }
  const action = new ActionCreate(loggerMock)
  action.appRoot = process.cwd()
  action.generate = (options: any) => {
    console.log(options)
  }

  action.handleCommonOptions(parameters)
  await action.loadConfig(filesystemMock)
  action.setParameters(parameters)
  await action.exec(false)
})
