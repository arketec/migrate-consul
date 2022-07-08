import { ActionRestore } from '../actions/utility/ActionRestore'
import { GluegunToolbox } from 'gluegun'

module.exports = {
  name: 'restore',
  description: 'restores the consul value from the backup of the provided key',
  alias: ['r'],
  run: async (toolbox: GluegunToolbox) => {
    const {
      parameters,
      print: { info, debug, error },
      filesystem,
      prompt,
    } = toolbox
    const action = new ActionRestore({ info, debug, error })
    action.appRoot = process.cwd()
    action.prompt = prompt

    action.handleCommonOptions(parameters)
    await action.loadConfig(filesystem)
    action.setParameters(parameters)
    await action.exec()
  },
}
