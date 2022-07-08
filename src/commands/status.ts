import { ActionStatus } from '../actions/utility/ActionStatus'
import { GluegunToolbox } from 'gluegun'

module.exports = {
  name: 'status',
  alias: ['stat'],
  description: 'print status of migrations',
  run: async (toolbox: GluegunToolbox) => {
    const {
      parameters,
      print: { info, debug, error },
      filesystem,
    } = toolbox

    const action = new ActionStatus({ info, debug, error })
    action.appRoot = process.cwd()

    action.handleCommonOptions(parameters)
    await action.loadConfig(filesystem)
    action.setParameters(parameters)
    await action.exec()
  },
}
