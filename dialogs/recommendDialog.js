// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { TimexProperty } = require('@microsoft/recognizers-text-data-types-timex-expression');
const { InputHints, MessageFactory } = require('botbuilder');
const { ConfirmPrompt, TextPrompt, ChoiceFactory, ChoicePrompt, WaterfallDialog } = require('botbuilder-dialogs');
const { CancelAndHelpDialog } = require('./cancelAndHelpDialog');
const { DateResolverDialog } = require('./dateResolverDialog');


const CONFIRM_PROMPT = 'confirmPrompt';
const DATE_RESOLVER_DIALOG = 'dateResolverDialog';
const TEXT_PROMPT = 'textPrompt';
const CHOICE_PROMPT = "CHOICE_PROMPT";
const WATERFALL_DIALOG = 'waterfallDialog';

class RecommendDialog extends CancelAndHelpDialog {
    constructor(id) {
        super(id || 'recommendDialog');

        this.addDialog(new TextPrompt(TEXT_PROMPT))
            .addDialog(new ChoicePrompt(CHOICE_PROMPT))
            .addDialog(new ConfirmPrompt(CONFIRM_PROMPT))
            .addDialog(new DateResolverDialog(DATE_RESOLVER_DIALOG))
            .addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
                this.cuisineStep.bind(this),
                this.priceStep.bind(this),
                this.deliveryStep.bind(this),
                this.confirmStep.bind(this),
                this.finalStep.bind(this)
            ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    /**
     * If a cuisine has not been provided, prompt for one.
     */
    async cuisineStep(stepContext) {
        const recDetails = stepContext.options;

        if (!recDetails.cuisine.cuisine) {
            const messageText = 'What kind of food do you want?';
            const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
            return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
        }
        return await stepContext.next(recDetails.cuisine);
    }

    /**
     * If a price point has not been provided, prompt for one.
     */
    async priceStep(stepContext) {
        const recDetails = stepContext.options;

        // Capture the response to the previous step's prompt
        recDetails.cuisine = stepContext.result;
        if (!recDetails.price.price) {
            const messageText = 'What price point are you looking for?';
            const msg = MessageFactory.text(messageText, 'What price point are you looking for?', InputHints.ExpectingInput);
            return await stepContext.prompt(CHOICE_PROMPT, { prompt: msg,
            choices: ChoiceFactory.toChoices(["cheap", "reasonably priced", "expensive"]) });
        }
        return await stepContext.next(recDetails.price);
    }

    /**
     * If a delivery option has not been provided, prompt for one.
     */
    async deliveryStep(stepContext) {
        const recDetails = stepContext.options;

        // Capture the results of the previous step
        recDetails.price.price = stepContext.result;
        if (!recDetails.delivery.delivery) {
            const messageText = 'Would you like delivery?';
            const msg = MessageFactory.text(messageText, 'Would you like delivery?', InputHints.ExpectingInput);
            return await stepContext.prompt(CHOICE_PROMPT, { prompt: msg,
            choices: ChoiceFactory.toChoices(["delivery", "take-out", "dine-in"]) });
        }
        return await stepContext.next(recDetails.delivery);
    }

    /**
     * Confirm the information the user has provided.
     */
    async confirmStep(stepContext) {
        const recDetails = stepContext.options;

        // Capture the results of the previous step
        recDetails.delivery.delivery = stepContext.result;
        // so, I think that the reason cuisine is different from the others is because it's not the button type
        const messageText = `Please confirm, I have you looking for a ${ recDetails.price.price.value } ${ recDetails.cuisine.cuisine } restaurant for ${ recDetails.delivery.delivery.value }. Is this correct?`;
        const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);

        // Offer a YES/NO prompt.
        return await stepContext.prompt(CONFIRM_PROMPT, { prompt: msg });
    }

    /**
     * Complete the interaction and end the dialog.
     */
    async finalStep(stepContext) {
        if (stepContext.result === true) {
            const recDetails = stepContext.options;
            return await stepContext.endDialog(recDetails);
        }
        return await stepContext.endDialog();
    }

    isAmbiguous(timex) {
        const timexPropery = new TimexProperty(timex);
        return !timexPropery.types.has('definite');
    }
}

module.exports.RecommendDialog = RecommendDialog;
