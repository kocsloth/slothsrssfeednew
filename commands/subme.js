const getSubList = require('./util/getSubList.js')
const currentGuilds = require('../util/storage.js').currentGuilds
const MenuUtils = require('./util/MenuUtils.js')
const log = require('../util/logger.js')
const config = require('../config.json')

async function addRole (message, role, link) {
  message.member.addRole(role)
  .then(mem => {
    log.command.info(`Role successfully added to member`, message.guild, role, message.author)
    message.channel.send(`You now have the role \`${role.name}\`, subscribed to **<${link}>**.`).catch(err => log.command.warning('subme 3a', err))
  })
  .catch(err => {
    message.channel.send(`Error: Unable to add role.` + err.message ? ` (${err.message})` : '')
    log.command.warning(`Unable to add role to user`, message.guild, role, message.author, err).catch(err => log.command.warning('subme 3b', err))
  })
}

module.exports = async (bot, message, command) => {
  try {
    const guildRss = currentGuilds.get(message.guild.id)
    if (!guildRss || !guildRss.sources || Object.keys(guildRss.sources).length === 0) return await message.channel.send('There are no active feeds to subscribe to.')

    const rssList = guildRss.sources
    const options = getSubList(bot, message.guild, rssList)
    if (!options) return await message.channel.send('There are either no feeds with subscriptions, or no eligible subscribed roles that can be self-added.')
    const msgArr = message.content.split(' ')
    const mention = message.mentions.roles.first()
    if (msgArr.length > 1) {
      msgArr.shift()
      const predeclared = msgArr.join(' ').trim()
      const role = message.guild.roles.find('name', predeclared)
      for (var option in options) {
        if (role && options[option].roleList.includes(role.id)) return addRole(message, role, options[option].source.link)
        else if (mention && options[option].roleList.includes(mention.id)) return addRole(message, mention, options[option].source.link)
      }
      return await message.channel.send(`That is not a valid role to add. Note that roles are case-sensitive. To see the the full list of roles that can be added, type \`${config.bot.prefix}subme\`.`)
    }

    const ask = new MenuUtils.Menu(message, null, { numbered: false })
      .setTitle('Self-Subscription Addition')
      .setDescription(`Below is the list of feeds, their channels, and its eligible roles that you may add to yourself. Type **${config.bot.prefix}subme role** to add the role to yourself.\u200b\n\u200b\n`)

    for (let option in options) {
      const temp = []
      for (var roleID in options[option].roleList) temp.push(message.guild.roles.get(options[option].roleList[roleID]).name)
      temp.sort()
      const channelName = message.guild.channels.get(options[option].source.channel).name
      const title = options[option].source.title
      let desc = `**Link**: ${options[option].source.link}\n**Channel**: #${channelName}\n**Roles**:`
      for (var x = 0; x < temp.length; ++x) {
        const cur = temp[x]
        const next = temp[x + 1]
        desc += `${cur}\n`
        // If there are too many roles, add it into another field
        if (desc.length < 1024 && next && (`${next}\n`.length + desc.length) >= 1024) {
          ask.addOption(title, desc, true)
          desc = `**Link**: ${options[option].source.link}\n**Channel:** #${channelName}\n`
        }
      }
      ask.addOption(title, desc, true)
    }

    ask.send(null, async (err, data) => {
      try {
        if (err) return err.code === 50013 ? null : await message.channel.send(err.message)
      } catch (err) {
        log.command.warning(`subme 2`, message.guild, err)
      }
    })
  } catch (err) {
    log.command.warning(`subme`, message.guild, err)
  }
}
