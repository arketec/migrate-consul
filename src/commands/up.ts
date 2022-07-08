import { ActionUp } from '../actions/migration/ActionUp'
import { GluegunToolbox } from 'gluegun'

module.exports = {
  name: 'up',
  alias: ['u'],
  description: 'runs the up migration for all staged migrations',
  run: async (toolbox: GluegunToolbox) => {
    const {
      parameters,
      print: { info, debug, error },
      filesystem,
    } = toolbox
    const action = new ActionUp({ info, debug, error })
    action.appRoot = process.cwd()
    action.filesystem = filesystem

    action.handleCommonOptions(parameters)
    await action.loadConfig(filesystem)
    action.setParameters(parameters)
    await action.exec()
  },
}
