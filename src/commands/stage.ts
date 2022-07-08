import { ActionStage } from '../actions/migration/ActionStage'
import { GluegunToolbox } from 'gluegun'

module.exports = {
  name: 'stage',
  alias: ['s'],
  description: 'stages the migrations for deployment',
  run: async (toolbox: GluegunToolbox) => {
    const {
      parameters,
      print: { info, debug, error },
      filesystem,
    } = toolbox

    const action = new ActionStage({ info, debug, error })
    action.appRoot = process.cwd()
    action.filesystem = filesystem

    action.handleCommonOptions(parameters)
    await action.loadConfig(filesystem)
    action.setParameters(parameters)
    await action.exec()
  },
}
