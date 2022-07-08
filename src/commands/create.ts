import { ActionCreate } from '../actions/migration/ActionCreate'
import { GluegunToolbox } from 'gluegun'

module.exports = {
  name: 'create',
  alias: ['c'],
  description: 'creates a new migration file in the migrations directory',
  run: async (toolbox: GluegunToolbox) => {
    const {
      parameters,
      template: { generate },
      print: { info, debug, error },
      filesystem,
    } = toolbox
    const action = new ActionCreate({ info, debug, error })
    action.appRoot = process.cwd()
    action.generate = generate

    action.handleCommonOptions(parameters)
    await action.loadConfig(filesystem)
    action.setParameters(parameters)
    await action.exec()
  },
}
