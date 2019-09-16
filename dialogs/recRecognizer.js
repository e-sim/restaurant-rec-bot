// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { LuisRecognizer } = require('botbuilder-ai');

class RestaurantRecRecognizer {
    constructor(config) {
        const luisIsConfigured = config && config.applicationId && config.endpointKey && config.endpoint;
        if (luisIsConfigured) {
            this.recognizer = new LuisRecognizer(config, {}, true);
        }
    }

    get isConfigured() {
        return (this.recognizer !== undefined);
    }

    /**
     * Returns an object with preformatted LUIS results for the bot's dialogs to consume.
     * @param {TurnContext} context
     */
    async executeLuisQuery(context) {
        return await this.recognizer.recognize(context);
    }

    getCuisineEntity(result){
        let cuisineValue;
        if (result.entities.$instance.Cuisine){
            cuisineValue = result.entities.$instance.Cuisine[0].text;
        }
        return { cuisine: cuisineValue };
    }

    getPriceEntity(result){
        let priceValue;
        if (result.entities.$instance.Price){
            priceValue = result.entities.$instance.Price[0].text;
        }
        return { price: priceValue };
    }

    getDeliveryEntity(result){
        let deliveryValue;
        if (result.entities.$instance.Delivery){
            deliveryValue = result.entities.$instance.Delivery[0].text;
        }
        return { delivery: deliveryValue };
    }



    /**
     * This value will be a TIMEX. And we are only interested in a Date so grab the first result and drop the Time part.
     * TIMEX is a format that represents DateTime expressions that include some ambiguity. e.g. missing a Year.
     */
    getTravelDate(result) {
        const datetimeEntity = result.entities['datetime'];
        if (!datetimeEntity || !datetimeEntity[0]) return undefined;

        const timex = datetimeEntity[0]['timex'];
        if (!timex || !timex[0]) return undefined;

        const datetime = timex[0].split('T')[0];
        return datetime;
    }
}

//module.exports.FlightBookingRecognizer = FlightBookingRecognizer;
module.exports.RestaurantRecRecognizer = RestaurantRecRecognizer;
