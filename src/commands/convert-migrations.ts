import { ActionCopyFromDb } from './../actions/utility/ActionCopyFromDb'

import { GluegunToolbox } from 'gluegun'

module.exports = {
  name: 'convert-migrations',
  description: 'copies migration data from the database',
  alias: ['cm'],
  run: async (toolbox: GluegunToolbox) => {
    const {
      parameters,
      print: { info, debug, error },
      filesystem,
    } = toolbox
    const action = new ActionCopyFromDb({ info, debug, error })
    action.appRoot = process.cwd()

    action.handleCommonOptions(parameters)
    await action.loadConfig(filesystem)
    action.setParameters(parameters)
    await action.exec()
  },
}
