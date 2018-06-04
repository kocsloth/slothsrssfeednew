const needle = require('needle')
const dbOps = require('../../util/dbOps.js')
const log = require('../../util/logger.js')

function getID (message) {
  return new Promise((resolve, reject) => {
    const arr = message.content.split(' ')
    const id = arr[1]
    if (!id) return reject(new Error('No ID found'))
    const attachment = message.attachments.first()
    const url = attachment ? attachment.url : undefined
    if (!url) return reject(new Error('No attachment found'))
    needle.get(url, (err, res) => {
      if (res.statusCode !== 200) return reject(new Error(`Non-200 status code: `, res))
      if (err) return reject(err)
      try {
        const file = JSON.parse(JSON.stringify(res.body))
        delete file._id
        delete file.__v
        if (!file.id) return reject(new Error('No ID found in file'))
        if (file.id !== id) return reject(new Error('File ID does not match input ID'))
        resolve(file)
      } catch (err) { reject(err) }
    })
  })
}

exports.normal = async (bot, message) => {
  try {
    const file = await getID(message)
    const id = file.id
    if (!bot.guilds.has(id)) return await message.chanel.send(`Unable to restore server, ID ${id} was not found in bot's cache.`)
    dbOps.guildRss.update(file)
    await message.channel.send(`Server (ID: ${id}, Name: ${bot.guilds.get(id).name}) has been restored.`)
  } catch (err) {
    message.channel.send(err.message).catch(err => log.contorller.warning('restore', err))
    log.controller.warning(`Unable to restore server`, message.author, err)
  }
}

exports.sharded = async (bot, message) => {
  try {
    const file = await getID(message)
    const id = file.id
    const res = await bot.shard.broadcastEval(`this.guilds.has('${id}')`)
    for (var i = 0; i < res.length; ++i) {
      if (!res[i]) continue
      dbOps.guildRss.update(file)
      await message.channel.send(`Server (ID: ${id}, Name: ${bot.guilds.get(id).name}) has been restored.`)
    }
  } catch (err) {
    message.channel.send(err.message).catch(err => log.contorller.warning('restore', err))
    log.controller.warning(`Unable to restore server`, message.author, err)
  }
}