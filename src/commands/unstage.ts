import { ActionUnstage } from '../actions/migration/ActionUnstage'
import { GluegunToolbox } from 'gluegun'

module.exports = {
  name: 'unstage',
  alias: ['un'],
  description: 'removes the migrations from deployment',
  run: async (toolbox: GluegunToolbox) => {
    const {
      parameters,
      print: { info, debug, error },
      filesystem,
    } = toolbox
    const action = new ActionUnstage({ info, debug, error })
    action.appRoot = process.cwd()

    action.handleCommonOptions(parameters)
    await action.loadConfig(filesystem)
    action.setParameters(parameters)
    await action.exec()
  },
}
