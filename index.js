
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

import fetch from 'node-fetch';
import axios from "axios";

const client_id = "";
const client_secret = "";
const TableName = "demo_poc_nuviadi_facebook_page_id";
const url = ""

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    const query = event.queryStringParameters || {};
    const code = query.code;
    try {
        if (!code) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing code from Facebook' }),
            };
        }
        const redirectUri = encodeURIComponent(`${url}`);
        const tokenRes = await fetch(
            `https://graph.facebook.com/v22.0/oauth/access_token?` +
            `client_id=${client_id}` +
            `&redirect_uri=${redirectUri}` +
            `&client_secret=${client_secret}` +
            `&code=${code}`
        );

        const tokenData = await tokenRes.json();
        if (tokenData.error) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: tokenData.error.message }),
            };
        }
        const accessToken = tokenData.access_token;
        let userPages = [];
        try {
            const userData2 = await fetch(`https://graph.facebook.com/me/accounts?access_token=${accessToken}`);
            const userData2Json = await userData2.json();
            userPages = userData2Json.data || [];
            for (let i = 0; i < userPages.length; i++) {
                const command = new PutCommand({
                    TableName: TableName,
                    Item: {
                        PageID: String(userPages[i].id),
                        pageToken: userPages[i].access_token,
                        pageName: userPages[i].name,
                        pageCategory: userPages[i].category,
                    }
                });
                await dynamo.send(command);
            }

            for (let i = 0; i < userPages.length; i++) {
                const response = await axios.post(
                    `https://graph.facebook.com/v22.0/${userPages[i].id}/subscribed_apps`,
                    new URLSearchParams({
                        subscribed_fields: "messages,messaging_postbacks",
                        access_token: userPages[i].access_token,
                    }),
                    {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    }
                );
                if (!response.data.success) {
                    return {
                        statusCode: 200,
                        body: {
                            error: response.data
                        }
                    }
                }
            }
            return {
                statusCode: 200,
                body: {
                    statue: "all subscribed_apps finish",
                    api: userPages,
                }
            }
        } catch (err) {
            console.error("Error fetching user pages =>", err);
            return {
                statusCode: 200,
                body: `fetch error ${err}`
            }
        }
    } catch (err) {
        return {
            statusbar: 200,
            body: "error 1 : " + err
        }
    }


    // ดึงเพจที่ผู้ใช้จัดการอยู่


    // const redirectUrl =
    //     `http://localhost:3000/view/login?` +
    //     `accessToken=${encodeURIComponent(accessToken)}` +
    //     `&uid=${encodeURIComponent(userData.id)}` +
    //     `&name=${encodeURIComponent(userData.name)}`;

    // return {
    //     statusCode: 302,
    //     headers: {
    //         Location: redirectUrl,
    //     },
    //     body: "",
    // };

};


// await dynamo.send(
//     new PutCommand({
//         TableName: TABLE_NAME,
//         Item: {
//             id: ms,
//             username: setJson.username,
//             age: setJson.age,
//         },
//     })
// );