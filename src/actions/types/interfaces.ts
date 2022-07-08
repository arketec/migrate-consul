export interface CommonOptions {
  help: string
  path: string
  configPath: string
  debug: string
}

export interface CommonConsulOptions extends CommonOptions {
  token: string
}
