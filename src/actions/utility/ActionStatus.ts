import * as Table from 'cli-table2'

import { ActionDBBase } from '../ActionDBBase'
import { CommonOptions } from '../types/interfaces'
import { IRepo } from '../../data'

import Consul = require('consul')

export class ActionStatus extends ActionDBBase<CommonOptions> {
  constructor(
    loggers: {
      info: (msg: any) => void
      error: (msg: any) => void
      debug: (msg: any, title?: string) => void
    },
    consul?: Consul.Consul,
    repo?: IRepo
  ) {
    super(
      'status',
      'Usage: migrate-consul status [...options]',
      {
        help: 'prints this help menu',
        path: 'path to directory containing the migrations',
        configPath: 'path to directory containing migrate-consul-config.jsonc',
        debug: 'print debug info while running',
      },
      ['migrate-consul status', 'migrate-consul status --path path/to/config'],
      loggers,
      consul,
      repo
    )
  }

  protected async _executionFunction() {
    this.getService()
    function printReport(results: any) {
      const table = new Table({
        head: [
          'Name',
          'Author',
          'Status',
          'Last Changed By',
          'Date of Last Change',
          'Date Migration Applied',
        ],
      })

      const Status = {
        0: 'PENDING',
        1: 'FAILED',
        2: 'SUCCESS',
      }
      results.forEach((row) => {
        table.push([
          row.name,
          row.script_author,
          Status[row.status],
          row.changed_by,
          row.date_last_changed ? row.date_last_changed.toString() : '',
          row.date_applied ? row.date_applied.toString() : '',
        ] as any)
      })
      console.log(table.toString())
    }
    const migrations = await this.service.getAll()
    printReport(migrations)
    return 0 as 0 | 1
  }
}
