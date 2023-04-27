import { createHash } from 'crypto'
import { DataService } from '../../data'

export default async function stageFromFilesystem(
  service: DataService,
  loggers: {
    info: (msg: any) => void
    error: (msg: any) => void
    debug: (msg: any, title?: string) => void
  },
  filesystem: {
    listAsync: (dir: string) => Promise<string[]>
    readAsync: (file: string) => Promise<string>
  },
  migrationsDir: string,
  author?: string
) {
  const files = await filesystem.listAsync(migrationsDir)
  for (const file of files) {
    if (file.endsWith('-sample.ts')) {
      loggers.info(
        `skipping sample migration file, ${file}. If this is a mistake, please end filename with something other than -sample.ts`
      )
      continue
    }
    const hasMigration = await service.hasMigration(file)

    if (!hasMigration) {
      const now = new Date()
      const content = await filesystem.readAsync(`${migrationsDir}/${file}`)
      if (!content) {
        loggers.error(`content not found for file ${file}`)
        return 1
      }
      const hashFunc = createHash('sha1')
      await service.save({
        name: file,
        date_added: now,
        status: 0,
        hash: hashFunc.update(content).digest('base64'),
        script_author: author,
      })
      loggers.info(`staged migration ${file}`)
    }
  }
  return 0
}
