import { ActionBackup } from '../actions/utility/ActionBackup'
import { GluegunToolbox } from 'gluegun'

module.exports = {
  name: 'backup',
  description: 'backs up the consul value of the provided key',
  alias: ['b'],
  run: async (toolbox: GluegunToolbox) => {
    const {
      parameters,
      print: { info, debug, error },
      filesystem,
    } = toolbox
    const action = new ActionBackup({ info, debug, error })
    action.appRoot = process.cwd()

    action.handleCommonOptions(parameters)
    await action.loadConfig(filesystem)
    action.setParameters(parameters)
    await action.exec()
  },
}
