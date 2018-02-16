const golos = require('steem')
const WP = require('wordpress-rest-api');
const cron = require('node-cron');



const wp = new WP(
{
    endpoint: 'http://wishlife.tk/wp-json'
});
const wpFormatForNoReward = 'link'
const wpFormatForAllInpower = 'aside'
const postLimit = 10
const postInterval = 1000 * 60 * 5
golos.config.set('websocket', 'wss://ws.golos.io');
golos.config.set('address_prefix', 'GLS');
golos.config.set('chain_id', '782a3039b478c839e4cb0c941ff4eaeb7df40bdd68bd441afd444b9da763de12');
const author = {}
const t = 1000
const cyrTag = () =>
{
    const _associations = {
        "а": "a",
        "б": "b",
        "в": "v",
        "ґ": "g",
        "г": "g",
        "д": "d",
        "е": "e",
        "ё": "yo",
        "є": "ye",
        "ж": "zh",
        "з": "z",
        "и": "i",
        "і": "i",
        "ї": "yi",
        "й": "ij",
        "к": "k",
        "л": "l",
        "м": "m",
        "н": "n",
        "о": "o",
        "п": "p",
        "р": "r",
        "с": "s",
        "т": "t",
        "у": "u",
        "ф": "f",
        "x": "kh",
        "ц": "cz",
        "ч": "ch",
        "ш": "sh",
        "щ": "shch",
        "ъ": "xx",
        "ы": "y",
        "ь": "x",
        "э": "ye",
        "ю": "yu",
        "я": "ya",
        "ґ": "g",
        "і": "i",
        "є": "e",
        "ї": "i"
    };

    return {
        transform: transform
    }

    function transform(str, spaceReplacement)
    {
        if (!str)
        {
            return "";
        }
        let new_str = '';
        let ru = ''
        for (let i = 0; i < str.length; i++)
        {
            let strLowerCase = str[i].toLowerCase();

            if (strLowerCase === " " && spaceReplacement)
            {
                new_str += spaceReplacement;

                continue;
            }

            if (!_associations[strLowerCase])
            {
                new_str += strLowerCase;
            }
            else
            {
                new_str += _associations[strLowerCase];

                ru = 'ru--';
            }
        }
        return ru + new_str;
    }
};

cron.schedule('*/20 * * * *', function(){
      console.log('running a task every 20 mins');
      wp.posts()
          .perPage(postLimit)
          .embed()
          .get(function(err, posts)
          {
              if (err)
              {
                  console.log('Ошибка wordpress', err)
              }

              const g = []
              for (let post of posts)
              {
                  console.log(JSON.stringify(post));
                  g.push(
                  {
                      title: post.title['rendered'],
                      content: post.content['rendered'],
                      permlink: post.slug,
                      status: post.status,
                      update: post.modified_gmt,
                      time: post.date_gmt,
                      tags: post._embedded['wp:term'][1],
                      topic: post._embedded['wp:term'][0][0].name,
                      author: post._embedded['author'][0].slug,
                      thumb: (typeof post._embedded['wp:featuredmedia'] === 'undefined') ? '' : post._embedded['wp:featuredmedia'][0].source_url,
                      embedded: post._embedded,
                      format: post.format
                  })
              }

              console.log(`Начало работы...`)
              const summ = g.length
              let n = 0

              let posting = () =>
              {
                  const terms = []
                  const wptags = g[n].tags
                  for (let tag of wptags)
                  {
                      terms.push(cyrTag().transform(tag['name'], '-'))
                  }
                  const topic = cyrTag().transform(g[n].topic, '-')
                  const tags = terms

                  switch (g[n].author)
                  {
                      case "add author name":
                          author.login = 'add login'
                          author.wif = 'add key'
                          break;

                      case "harms":
                          author.login = 'harms'
                          author.wif = '5.........'
                          break;

                      case "orwell":
                          author.login = 'orwell'
                          author.wif = '5.........'
                          break;
                      default:
                          author.login = ''
                          author.wif = ''

                  }
                  const permlink = g[n].permlink

                  golos.api.getContent(author.login, permlink, function(err, result)
                  {
                      if (err)
                      {
                          console.log('Ошибка: ', err);
                      }
                      const isNew = result.permlink === ''

                      const golosTime = Date.parse(result.last_update) / t

                      const wpTime = Date.parse(g[n].update) / t
                      const isUpdate = result.permlink === g[n].permlink && golosTime < wpTime
                      if (isNew || isUpdate)
                      {
                          console.log(`Публикация ${n +1} из ${summ}>>> ${g[n].title}`)
                          const percentSteemDollars = (g[n].format === wpFormatForAllInpower) ? 0 : 10000;
                          const maxAcceptedPayout = (g[n].format === wpFormatForNoReward) ? '0.000 GBG' : '1000000.000 GBG';
                          const jsonMetadata = {
                              "tags": tags,
                              "image": [
                                  g[n].thumb
                              ],
                              "app": "Wordpress importer (vik)",
                              "format": "html"
                          }
                          golos.broadcast.comment(
                              author.wif, '', topic, author.login, permlink, g[n].title, g[n].content, jsonMetadata,

                              function(err, result)
                              {

                                  if (err)
                                  {
                                      console.log('Ошибка: ', err);
                                  }
                                  if (!isUpdate)
                                  {
                                      setTimeout(() =>
                                      {
                                          golos.broadcast.commentOptions(
                                              author.wif, author.login, permlink, maxAcceptedPayout, percentSteemDollars, true, true, [],
                                              function(err, result)
                                              {
                                                  if (err)
                                                  {
                                                      console.log('Ошибка: ', err);
                                                  }
                                              });

                                      }, 1000);
                                  }

                              });

                      }

                      if (isUpdate)
                      {
                          console.log(`Обновление поста: ${g[n].title}`)
                      }
                      n++
                      if (n === summ)
                      {

                          clearInterval(posting)
                          console.log(`========== Постинг окончен ===========`)
                          setTimeout(() =>
                          {

                              process.exit()
                          }, 6000);
                      }

                  });
              }

              posting()
              setInterval(posting, postInterval);

          });

    });
