import { parse } from 'hjson'

export interface IConfig {
  database?: MongoConfig
  consul: ConsulConfig
  generation: GenerationOptions
  diff: Diff
  migrationsDirectory: string
  environment: string
  debug?: boolean
}
export class Config implements IConfig {
  public database?: MongoConfig
  public consul: ConsulConfig
  public generation: GenerationOptions
  public diff: Diff
  public migrationsDirectory: string
  public environment: string
  public debug?: boolean

  constructor(config?: IConfig) {
    this.database = config?.database
    this.consul = config?.consul
    this.environment = config?.environment
    this.diff = config.diff
    this.generation = config?.generation
    this.migrationsDirectory = config?.migrationsDirectory
    this.debug = config?.debug
  }

  public static async load(fs: Filesystem, path: string): Promise<Config> {
    const tmp = await fs.readAsync(path)
    if (!tmp) throw new Error(`${path} does not exist`)
    const config = parse(tmp)
    for (const [_, value] of Object.entries<any>(config)) {
      if (value.connectionStringEnvVar) {
        value.connectionString = process.env[value.connectionStringEnvVar]
      }
    }
    return new Config(config as Config)
  }
  public static loadSync(fs: Filesystem, path: string): Config {
    const tmp = fs.read(path)
    if (!tmp) throw new Error(`${path} does not exist`)
    const config = parse(tmp)
    for (const [_, value] of Object.entries<any>(config)) {
      if (value.connectionStringEnvVar) {
        value.connectionString = process.env[value.connectionStringEnvVar]
      }
    }
    return new Config(config as Config)
  }
  public static tryLoadSync(fs: Filesystem, path: string): Config {
    try {
      const tmp = fs.read(path)
      const config = parse(tmp)
      for (const [_, value] of Object.entries<any>(config)) {
        if (value.connectionStringEnvVar) {
          value.connectionString = process.env[value.connectionStringEnvVar]
        }
      }
      return new Config(config as Config)
    } catch {
      return undefined
    }
  }
}
export interface Filesystem {
  readAsync: (path: string) => Promise<string>
  read: (path: string) => string
}

export interface IWebServer {
  host: string
  port: number
  connectionString?: string
  connectionStringEnvVar?: string
}
export interface MongoConfig extends IWebServer {
  dbname: string
}
export interface ConsulConfig extends IWebServer {
  secure?: boolean
  acl: boolean
  aclTokenEnvVar?: string
  aclToken?: string
}

export interface Diff {
  maxDiffLength: number
  colors: {
    bg: string
    added: string
    removed: string
    unchanged: string
  }
}

export interface GenerationOptions {
  printExamples: boolean
  generateTypesFromKeys: boolean
  includeTypes: boolean
}
