/**
 * Created by junghoon on 2014. 3. 24
 */
var request = require('request'),                           // to send the HTTP GET request to the rss server
    xml2js = require('xml2js'),                             // XML Parser (RSS is in XML Format)
    cheerio = require('cheerio'),                           // HTML Parser
    mongoose = require('mongoose');                         // MongoDB Connector
var FEED_URL = "http://dhcdn.design.co.kr/rss/?m=luxury";   // RSS Feed URL
var parser = new xml2js.Parser();                           // Parser Initialization

var DB_URL = "mongodb://localhost/tapzindb";                // MongoDB URL
var Schema = mongoose.Schema;                               // MongoDB Schema
var articleSchema = new Schema({                            // Our MongoDB Article Schema
    Title:      String,
    Link:       String,
    ImageLink:  String,
    Excerpt:    String,
    Category:   String,
    Date:       String
});
var Article = mongoose.model('Article', articleSchema);     // Our Article model from Schema

mongoose.connect(DB_URL, function(error){
    if(error){
        console.log("Error connecting " + DB_URL);
        throw error;
    }
    else{
        // once connection is established we don't have to worry about db presence : it creates one automatically when
        // there is a new data insertion
        parseContents();
    }
});

function parseContents(){
    request({ uri:FEED_URL}, function (error, response, body) {
        if( error && response.statusCode != 200) {
            console.log("Error connecting " + FEED_URL);
            throw error;
        }
        else{
            parser.parseString(body, function(err, result) {
                //length check
                console.log("Number of Items : ", result['rss']['channel'][0]['item'].length);
                result['rss']['channel'][0]['item'].forEach(function (item) {
                    var $ = cheerio.load(item['description'][0]);
                    var excerpt = "";
                    console.log("-----------------------------------");
                    console.log("Title : ", item['title'][0]);                              // title field
                    console.log("Link : ", item['link'][0]);                                // link field
                    console.log("Image Link : ", $("IMG").attr('src'));


                    $(":root").contents().filter(function (){                               // excerpt extraction...
                        return $(this)[0]['type'] === 'text';                               // here when the array element is accessed with $(this) each of them are represented as a single element
                    }).each(function () {                                                   // array of array. So we access its data by $(this)[0]['type']
                        excerpt = excerpt + $(this)[0]['data'];
                        });
                    console.log("Excerpt : ", excerpt);

                    //console.log(item['description']);                                     // description field (To Do : parse and extract image)
                    console.log("Category : ", item['category'][0]);                        // category field
                    console.log("Date : ", item['pubDate'][0]);                             // pubDate field

                    // DB Insertion
                    var article = new Article({
                        Title:      item['title'][0],
                        Link:       item['link'][0],
                        ImageLink:  $("IMG").attr('src'),
                        Excerpt:    excerpt,
                        Category:   item['category'][0],
                        Date:       item['pubDate'][0]
                    });
                    article.save(function (err){
                        if(err){
                            console.log("DB Insertion Error");
                            throw err;
                        }
                    });
                });
            });
        }
    });
}