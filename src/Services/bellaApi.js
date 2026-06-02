const API_URL =
    "https://script.googleusercontent.com/macros/echo?user_content_key=AUkAhnQ2dL6Qg8jUanvdqZVES1cLsHyeI3hGdR4eZSwhs_XUQBJ4Cf0dBHCRQb2y7CGjy7CIRu_uZSx7FJHVJhHCMBxsa3uZchSlegPpPgU4ohvieAjNDOpmuggmsbeqBQYgQlLc5VvTggwQDf0eEQ4sjvp8XgfDG21L04tWmsrXbCDntGvSFhe-3SZLW2TCMfh0g5X4cldE8oEjG7-oUkiLFiYk_QG5hi2Uv-FrFpX6UmVAmnZrRdTGvseT0NO0RO2AG5t-llqIy9zoDeatjlLQj1mGoC3TLg&lib=MTYYlU0G3KPEJYQ_JGJA0gzZecv0UgGo7";

async function getData() {

    const response =
        await fetch(API_URL);

    if (!response.ok) {

        throw new Error(
            `Bella API returned ${response.status}`
        );
    }

    return response.json();
}

module.exports = {

    async getFixtures() {

        const data =
            await getData();

        return data.Upcoming || [];
    },

    async getStaff() {

        const data =
            await getData();

        return data.Staff || [];
    },

    async getCompStats() {

        const data =
            await getData();

        return data.Dashboard?.[0] || null;
    }
};