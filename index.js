import { request } from 'undici';
import prompts from '@mrozio/prompts';
import pc from 'picocolors';
import base64 from 'base-64';

const START_TIME = process.hrtime();
const VALIDATE_TOKEN_URL = 'https://discord.com/api/v9/explicit-media/current-version';
const OPEN_LOOTBOX_URL = 'https://discord.com/api/v9/users/@me/lootboxes/open';
const CLAIM_PRIZE_URL = 'https://discord.com/api/v9/users/@me/lootboxes/redeem-prize';
const X_SUPER = {
    client_build_number: 280346
};
const X_SUPER_PROPERTIES = base64.encode(JSON.stringify(X_SUPER));

const ITEMS = {
    '1214340999644446726': 'Quack!!',
    '1214340999644446724': '⮕⬆⬇⮕⬆⬇',
    '1214340999644446722': 'Wump Shell',
    '1214340999644446720': 'Buster Blade',
    '1214340999644446725': 'Power Helmet',
    '1214340999644446723': 'Speed Boost',
    '1214340999644446721': 'Cute Plushie',
    '1214340999644446728': 'Dream Hammer',
    '1214340999644446727': 'OHHHHH BANANA'
};

let { token } = await prompts({
    type: 'password',
    message: 'Paste your discord token:',
    name: 'token',
    validate: async token => {
        const { statusCode } = await request(VALIDATE_TOKEN_URL, {
            method: 'GET',
            headers: {
                Authorization: token.trim(),
                'X-Super-Properties': X_SUPER_PROPERTIES
            }
        });
        
        if (statusCode !== 200) return 'Token not valid!';

        return true;
    }
});

token = token?.trim(); // get rid of empty characters

if (!token) process.exit();

async function claimPrize() {
    const { body } = await request(CLAIM_PRIZE_URL, {
        method: 'POST',
        headers: {
            Authorization: token,
            'X-Super-Properties': X_SUPER_PROPERTIES,
            'Content-type': 'application/json'
        }
    });

    const { redeemed_prize } = await body.json();
    const END_TIME = process.hrtime(START_TIME);
    const END_TIME_NANOSECONDS = END_TIME[0] * 1e9 + END_TIME[1];
    const END_TIME_SECONDS = END_TIME_NANOSECONDS / 1e9;

    if (redeemed_prize) {
        console.log(pc.green(pc.bold('Successfully claimed the prize! 🎉')));
        console.log('Time: %s seconds', END_TIME_SECONDS.toFixed(2));
    } else {
        console.log(pc.red('Failed to redeem the prize, retrying...'));
        setTimeout(openLootbox, 5e3);
    }
}

async function openLootbox() {
    const { body } = await request(OPEN_LOOTBOX_URL, {
        method: 'POST',
        headers: {
            Authorization: token,
            'X-Super-Properties': X_SUPER_PROPERTIES,
            'Content-type': 'application/json'
        }
    });

    const { retry_after, opened_item, user_lootbox_data: { opened_items, redeemed_prize } } = await body.json();

    if (retry_after) {
        console.log(pc.red('You are being rate limited, retrying in %d seconds'), retry_after * 1e3);
        setTimeout(openLootbox, retry_after);
        return;
    }

    if (redeemed_prize) {
        console.log(pc.yellow('You have already claimed the reward.'));
        return;
    }

    const openedItemsCount = Object.keys(opened_items).length;

    if (opened_items[opened_item] === 1) {
        console.log(pc.yellow('NEW ITEM!'), pc.bold(ITEMS[opened_item]));
        console.log(`${9 - openedItemsCount} items remaining.`);
    } else {
        console.log(pc.gray(`Got ${pc.bold(ITEMS[opened_item])} again. (${opened_items[opened_item]})`));
    }

    if (openedItemsCount >= 9) {
        await claimPrize();
        return;
    }

    setTimeout(openLootbox, 5e3); // cooldown is about 5 seconds
}

// start
openLootbox();