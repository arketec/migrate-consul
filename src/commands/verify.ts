import { ActionVerify } from '../actions/migration/ActionVerify'
import { GluegunToolbox } from 'gluegun'

module.exports = {
  name: 'verify',
  alias: ['ve'],
  description:
    'validates the migration script. Can be used to test the script before running',
  run: async (toolbox: GluegunToolbox) => {
    const {
      parameters,
      print: { info, debug, error },
      filesystem,
    } = toolbox
    const action = new ActionVerify({ info, debug, error })
    action.appRoot = process.cwd()
    action.filesystem = filesystem

    action.handleCommonOptions(parameters)
    await action.loadConfig(filesystem)
    action.setParameters(parameters)
    await action.exec()
  },
}
