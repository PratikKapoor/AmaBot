// Add your requirements
var restify = require('restify'); 
var builder = require('botbuilder'); 
var parseString = require('xml2js').parseString;

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.PORT || 3000, function() 
{
   console.log('%s listening to %s', server.name, server.url); 
});

// Create chat bot
var connector = new builder.ChatConnector
({ appId: 'f835e6e6-8afa-4aab-aa71-e98ef47a75e9', appPassword: 'aa2Kw7GoggQVfipHaFh0VT5' }); 
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

// Enable Conversation Data persistence
bot.set('persistConversationData', true);

// Create LUIS recognizer that points at our model and add it as the root '/' dialog for our Cortana Bot.
var model = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/4aaa2a7f-1301-4a8f-9854-97acfa6ca1cb?subscription-key=7e4b952786bf4615beb07aa60f749a47&verbose=true';
var recognizer = new builder.LuisRecognizer(model);
var dialog = new builder.IntentDialog({ recognizers: [recognizer] });

//Amazon Product API
var amazon = require('amazon-product-api');

var client = amazon.createClient({
  awsId: "AKIAJWYKWUURHW5JDYHQ",
  awsSecret: "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",
  awsTag: "pratik0d1-21"
});

//=========================================================
// Cards Carousel
//=========================================================

var intents = new builder.IntentDialog({ recognizers: [recognizer] });

bot.dialog('/', intents)

intents.matches('Greetings', [
    function (session, args, next) {
        if (!session.userData.name) {
            session.send("Hi, Welcome to Amazon Shopping Assistant!");
            session.beginDialog('/profile');
        } else {
            next();
        }
    },
    function (session, results) {
        session.send('Hello %s', session.userData.name);
        session.send("How can I help you today?");
    }
]);

intents.matches('ChangeName', [
    function (session) {
        session.beginDialog('/profile');
    },
    function (session, results) {
        session.send("Ok. I'll call you %s", session.userData.name);
    }
]);

bot.dialog('/profile', [
    function (session) {
        builder.Prompts.text(session, "Before we get started, what's your name?");
    },
    function (session, results) {
        session.userData.name = results.response;
        session.endDialog();
    }
]);

intents.matches('ShowMore',
[
    function(session, args)
    {

    }
]);

intents.matches('BuyProduct', 
[
    function (session, args, next) 
    {
        session.send('I am analyzing your request, %s', session.userData.name);

        // try extracting entities
        var productEntity = builder.EntityRecognizer.findEntity(args.entities, 'Product');
        var index = 0
        ;

        session.privateConversationData[productEntity] = productEntity;
        session.privateConversationData[index] = index;

        if (productEntity) {
            // product entity detected, continue to next step
            next({ response: productEntity.entity });
        } else {
            // no entities detected, ask user for a destination
            builder.Prompts.text(session, 'Please specify the product you are looking for');
        }
    },
    function (session, results) 
    {
        var message = 'Looking for products that match your requirement';
        session.send(message);

        var query = {
            Keywords: results.response,
            searchIndex: 'All',
            itemPage: 1,
            availability: 'Available',
            responseGroup: 'Images,ItemAttributes,OfferFull',
            domain: 'webservices.amazon.in',
        };
        
        client.itemSearch(query, function (error, results) 
        {
            if (error) 
            {
                console.log(error);
            } 
            else 
            {
                var index = session.privateConversationData[index];
                results = JSON.stringify(results)
                
                console.log(results);

                results = JSON.parse(results)
                
                var products = [];

                for(var i=0; i<10; i++)
                {
                    var productCard = new builder.HeroCard(session)
                    .title(results[i].ItemAttributes[0].Title[0])
                    //.subtitle(results[i].ItemAttributes[0].Brand[0])
                    //.text(results[i].Offers[0].Offer[0].OfferListing[0].Price[0].FormattedPrice[0])
                    .images([
                        builder.CardImage.create(session, results[i].MediumImage[0].URL[0])
                    ])
                    .buttons([
                        builder.CardAction.openUrl(session, results[0].DetailPageURL[0], 'Add to Cart')
                    ])    
                    products.push(productCard);

                }

                var reply = new builder.Message(session).attachmentLayout(builder.AttachmentLayout.carousel).attachments(products);

                session.send(reply);         
            }
        });
    }
]);

intents.matches('Logout',
[
    function(session)
    {
        session.send("See you soon!");
        session.endDialog();
        session.userData = null;
        session.privateConversationData = null;
    }
]);