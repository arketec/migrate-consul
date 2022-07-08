import { ActionBase } from '../ActionBase'
import { CommonConsulOptions } from '../types/interfaces'
import { nowAsString } from '../../util/DateFormatter'

export class ActionCreate extends ActionBase<CreateOptions> {
  public generate: any
  constructor(loggers: {
    info: (msg: any) => void
    error: (msg: any) => void
    debug: (msg: any, title?: string) => void
  }) {
    super(
      'create',
      'Usage: migrate-consul create <description> [...options]',
      {
        help: 'prints this help menu',
        path: 'path to directory containing the migrations',
        configPath: 'path to directory containing migrate-consul-config.jsonc',
        includeExamples: 'include examples in migration script generation',
        key: 'consul key for the migration',
        value: 'value for the migration',
        import:
          'create migration from provided --key option from existing consul',
        recurse: 'recurse key for --import',
        token: `consul ACL token if not in the environment variable provided in the config`,
        debug: 'print debug info while running',
      },
      [
        'migrate-consul create my_migration_description --key sample/path/to/key --recurse --import',
        'migrate-consul create my_migration_description --includeExamples --key sample/path/to/key --value "My Value"',
      ],
      loggers
    )
  }

  protected async _executionFunction() {
    const desc = this.parameters.first ?? `migration`
    const client = this.getConsul()

    const migrationsDir = this.config.migrationsDirectory
    let newFile = `${
      this.options.path ?? this.appRoot
    }/${migrationsDir}/${nowAsString()}-${desc}.ts`

    let value = this.options.value ?? 'Hello from migrate-consul'

    if (this.options.import) {
      if (!this.options.key || !this.options.key.length) {
        this.loggers.error('--key option required for import')
        return 1
      }

      if (this.options.key.endsWith('/') || this.options.recurse) {
        const consulResults = await client.kv.get<
          { Key: string; Value: string }[]
        >({
          key: this.options.key,
          recurse: true,
        })
        if (!consulResults || !consulResults.length) {
          this.loggers.error(
            `No consul results found for key ${this.options.key}`
          )
          return 1
        }
        this.loggers.debug(consulResults, 'consulResults')
        for (const consulResult of consulResults) {
          if (!consulResult.Value) {
            this.loggers.error(`no value found for key ${consulResult.Key}`)
          }
          newFile = `${
            this.options.path ?? this.appRoot
          }/${migrationsDir}/${nowAsString()}-${desc}-${consulResult.Key.replace(
            /\//g,
            '_'
          )}.ts`
          this.loggers.debug(newFile, 'migration filename')
          const types = []
          if (this.config.generation.generateTypesFromKeys) {
            types.push(tryGenTypes(consulResult.Key, consulResult.Value))
          }
          await this.generate({
            template: 'migration.ts.ejs',
            target: newFile,
            props: {
              key: consulResult.Key,
              value: consulResult.Value,
              showExamples:
                this.options.includeExamples ??
                this.config.generation.printExamples ??
                false,
              debug: this.options.debug ? true : this.config.debug ?? false,
              includeTypes: this.config.generation.includeTypes,
              types: types.filter((t) => t !== undefined),
              isSample: false,
            },
          })
        }
      } else {
        const consulResult = await client.kv.get<{ Value: string }>(
          this.options.key
        )
        this.loggers.debug(consulResult, 'consulResult')
        if (consulResult && consulResult.Value) value = consulResult.Value
        else {
          this.loggers.error(
            `No consul results found for key ${this.options.key}`
          )
          return 1
        }
        this.loggers.debug(newFile, 'migration filename')
        const types = []
        if (this.config.generation.generateTypesFromKeys) {
          types.push(tryGenTypes(this.options.key, consulResult.Value))
        }
        await this.generate({
          template: 'migration.ts.ejs',
          target: newFile,
          props: {
            key: this.options.key ?? 'sample',
            value,
            showExamples:
              this.options.examples ??
              this.config.generation.printExamples ??
              false,
            debug: this.options.debug ? true : this.config.debug ?? false,
            includeTypes: this.config.generation.includeTypes,
            types: types.filter((t) => t !== undefined),
            isSample: false,
          },
        })
      }
    } else {
      await this.generate({
        template: 'migration.ts.ejs',
        target: newFile,
        props: {
          key: this.options.key ?? 'sample',
          value: this.options.value ?? 'foo',
          showExamples:
            this.options.includeExamples ??
            this.config.generation.printExamples ??
            false,
          debug: this.options.debug ? true : this.config.debug ?? false,
          includeTypes: this.config.generation.includeTypes,
          types: [],
          isSample: false,
        },
      })
    }

    this.loggers.info(`Generated migration file at ${newFile}`)
    return 0
  }
}

export interface CreateOptions extends CommonConsulOptions {
  includeExamples: string
  key: string
  value: string
  import: string
  recurse: string
}

function tryGenTypes(key: string, obj: string) {
  try {
    const o = JSON.parse(obj)
    let type = `interface ${key.split('/').at(-1)} {
    `
    for (const [key, value] of Object.entries((o as any).length ? o[0] : o)) {
      if (typeof value === 'object') {
        if ((value as any).length) {
          type += `  ${key}: ${recurseObject(value[0], 2)}[];
  `
        } else {
          type += `  ${key}: ${recurseObject(value, 2)};
  `
        }
      } else
        type += `  ${key}: ${typeof value};
  `
    }
    type += `
  }`
    return type
  } catch {
    return undefined
  }
}

function recurseObject(o: any, space: number) {
  let type = `{
  `
  for (const [key, value] of Object.entries(o)) {
    if (!value) continue
    let tmp = space
    while (tmp-- > 0) type += ' '
    if (typeof value === 'object') {
      if ((value as any).length) {
        type += `  ${key}: ${recurseObject(value[0], 2 + space)}[];
  `
      } else {
        type += `  ${key}: ${recurseObject(value, 2 + space)};
  `
      }
    } else
      type += `  ${key}: ${typeof value};
  `
  }
  let tmp = space
  while (tmp-- > 0) type += ' '
  type += `}`
  return type
}
