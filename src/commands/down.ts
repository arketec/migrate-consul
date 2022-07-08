import { ActionDown } from '../actions/migration/ActionDown'
import { GluegunToolbox } from 'gluegun'

module.exports = {
  name: 'down',
  alias: ['d'],
  description: 'runs the down migration for the last n completed migrations',
  run: async (toolbox: GluegunToolbox) => {
    const {
      parameters,
      print: { info, debug, error },
      filesystem,
    } = toolbox
    const action = new ActionDown({ info, debug, error })
    action.appRoot = process.cwd()
    action.filesystem = filesystem

    action.handleCommonOptions(parameters)
    await action.loadConfig(filesystem)
    action.setParameters(parameters)
    await action.exec()
  },
}
