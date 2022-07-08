import { ActionInit } from '../actions/migration/ActionInit'
import { GluegunToolbox } from 'gluegun'

module.exports = {
  name: 'init',
  alias: ['i'],
  description:
    'Creates migration config file and migrations directory with a sample migration',
  run: async (toolbox: GluegunToolbox) => {
    const {
      parameters,
      template: { generate },
      filesystem,
      prompt,
      print: { info, debug, error },
    } = toolbox
    const action = new ActionInit({ info, debug, error })
    action.appRoot = process.cwd()
    action.generate = generate
    action.filesystem = filesystem
    action.prompt = prompt

    action.handleCommonOptions(parameters)
    action.setParameters(parameters)
    await action.exec()
  },
}
