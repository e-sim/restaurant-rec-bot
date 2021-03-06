// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { MessageFactory, InputHints, CardFactory } = require('botbuilder');
const { LuisRecognizer } = require('botbuilder-ai');
const { ComponentDialog, DialogSet, DialogTurnStatus, TextPrompt, WaterfallDialog } = require('botbuilder-dialogs');
const MexicanCard = require("../resources/mexicanCard.json");
const IndianCard = require("../resources/indianCard.json")

const MAIN_WATERFALL_DIALOG = 'mainWaterfallDialog';

class MainDialog extends ComponentDialog {
    constructor(luisRecognizer, recommendDialog) {
        super('MainDialog');

        if (!luisRecognizer) throw new Error('[MainDialog]: Missing parameter \'luisRecognizer\' is required');
        this.luisRecognizer = luisRecognizer;

        if (!recommendDialog) throw new Error('[MainDialog]: Missing parameter \'recommendDialog\' is required');

        // Define the main dialog and its related components.
        // This is a sample "book a flight" dialog.
        this.addDialog(new TextPrompt('TextPrompt'))
            .addDialog(recommendDialog)
            .addDialog(new WaterfallDialog(MAIN_WATERFALL_DIALOG, [
                this.introStep.bind(this),
                this.actStep.bind(this),
                this.finalStep.bind(this)
            ]));

        this.initialDialogId = MAIN_WATERFALL_DIALOG;
    }

    /**
     * The run method handles the incoming activity (in the form of a TurnContext) and passes it through the dialog system.
     * If no dialog is active, it will start the default dialog.
     * @param {*} turnContext
     * @param {*} accessor
     */
    async run(turnContext, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    /**
     * First step in the waterfall dialog. Prompts the user for a command.
     * Currently, this expects a booking request, like "book me a flight from Paris to Berlin on march 22"
     * Note that the sample LUIS model will only recognize Paris, Berlin, New York and London as airport cities.
     */
    async introStep(stepContext) {
        if (!this.luisRecognizer.isConfigured) {
            const messageText = 'NOTE: LUIS is not configured. To enable all capabilities, add `LuisAppId`, `LuisAPIKey` and `LuisAPIHostName` to the .env file.';
            await stepContext.context.sendActivity(messageText, null, InputHints.IgnoringInput);
            return await stepContext.next();
        }

        const messageText = stepContext.options.restartMsg ? stepContext.options.restartMsg : 'What kind of restaurant are you looking for?';
        const promptMessage = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
        return await stepContext.prompt('TextPrompt', { prompt: promptMessage });
    }

    /**
     * Second step in the waterfall.  This will use LUIS to attempt to extract the origin, destination and travel dates.
     * Then, it hands off to the bookingDialog child dialog to collect any remaining details.
     */
    async actStep(stepContext) {
        const recDetails = {};

        if (!this.luisRecognizer.isConfigured) {
            // LUIS is not configured, we just run the BookingDialog path.
            return await stepContext.beginDialog('recommendDialog', recDetails);
        }

        // Call LUIS and gather any potential booking details. (Note the TurnContext has the response to the prompt)
        const luisResult = await this.luisRecognizer.executeLuisQuery(stepContext.context);
        switch (LuisRecognizer.topIntent(luisResult)) {
        case 'FindRestaurant':
            // Extract the values for the composite entities from the LUIS result.
            //const fromEntities = this.luisRecognizer.getFromEntities(luisResult);
            //const toEntities = this.luisRecognizer.getToEntities(luisResult);
            const cuisineEntity = this.luisRecognizer.getCuisineEntity(luisResult);
            const priceEntity = this.luisRecognizer.getPriceEntity(luisResult);
            const deliveryEntity = this.luisRecognizer.getDeliveryEntity(luisResult);

            // Show a warning for Origin and Destination if we can't resolve them.
            // await this.showWarningForUnsupportedCities(stepContext.context, fromEntities, toEntities);
            // TODO do this for unsupported cuisines?  

            // Initialize recDetails with any entities we may have found in the response.
            recDetails.cuisine = cuisineEntity;
            recDetails.price = priceEntity;
            recDetails.delivery = deliveryEntity;
            console.log('LUIS extracted these details:', JSON.stringify(recDetails));

            // Run the BookingDialog passing in whatever details we have from the LUIS call, it will fill out the remainder.
            return await stepContext.beginDialog('recommendDialog', recDetails);


        default:
            // Catch all for unhandled intents
            const didntUnderstandMessageText = `Sorry, I didn't get that. Please try asking in a different way (intent was ${ LuisRecognizer.topIntent(luisResult) })`;
            await stepContext.context.sendActivity(didntUnderstandMessageText, didntUnderstandMessageText, InputHints.IgnoringInput);
        }

        return await stepContext.next();
    }



    /**
     * This is the final step in the main waterfall dialog.
     */
    async finalStep(stepContext) {

        if (stepContext.result) {
            const result = stepContext.result;

            // This is where calls to the booking AOU service or database would go. <----- NOTE!!!
            let cardName = result.cuisine;
            if (result.cuisine.cuisine){
              cardName = result.cuisine.cuisine
            }


            switch (cardName) {
            case "Indian":
              const indianCard = CardFactory.adaptiveCard(IndianCard);
            

            //const msg = `I found you something!`;


            //await stepContext.context.sendActivity(msg, msg, InputHints.IgnoringInput);
              await stepContext.context.sendActivity({
              text: "I found you something!",
              attachments: [indianCard]
              });
              break;
            case "tacos":
              const mexicanCard = CardFactory.adaptiveCard(MexicanCard);
              await stepContext.context.sendActivity({
              text: "I found you something!",
              attachments: [mexicanCard]
              });
              break;
            default:
              const messageText = `I'm sorry, I couldn't find any ${ cardName } restaurants with your specifications near you.`;
              await stepContext.context.sendActivity(messageText, messageText, InputHints.IgnoringInput);
          }
        }

        // Restart the main dialog with a different message the second time around
        return await stepContext.replaceDialog(this.initialDialogId, { restartMsg: 'What else can I do for you?' });
    }
}

module.exports.MainDialog = MainDialog;
