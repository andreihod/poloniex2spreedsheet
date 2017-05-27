var autobahn = require('autobahn');
var GoogleSpreadsheet = require('google-spreadsheet');
var MercadoBitcoin = require('mercadobitcoin').MercadoBitcoin;
var wsuri = "wss://api.poloniex.com";
var connection = new autobahn.Connection({
  url: wsuri,
  realm: "realm1"
});

var doc = new GoogleSpreadsheet('1pBtXrBjnG_FQLmhE4Qa31LsaWvOkAUiRH3dVPqHJQ1I');
var creds = require('./poloniex2spreedsheet-1c6b81b1bca3.json');

var priceCells = [];
var btcUsdCell, btcBrlCell;

var mb = new MercadoBitcoin({ currency: 'BTC' });

function tickerMercadoBitcoin(){
  if (btcBrlCell)
    mb.ticker(function (res) {
      var last = res.ticker.last;
      console.log('BTC_BRL', ' -> ', last);
      btcBrlCell.value = last;
      btcBrlCell.save();
    });
}

console.log('Autenticando...');
doc.useServiceAccountAuth(creds, function(){

  console.log('Carregando planilha...');

  doc.getInfo(function(err, info) {
    console.log('Planilha carregada: ' + info.title);
    sheet = info.worksheets[0];

    // células dos preços das moedas
    sheet.getCells({'min-row': 3,'max-row': 6,'min-col': 3,'max-col': 3,'return-empty': true
      }, function(err, cells) {
        priceCells = cells;
        console.log('Carregado células dos preços');
      });

    // célula do valor do BTC em USD
    sheet.getCells({'min-row': 2,'max-row': 2,'min-col': 11,'max-col': 11,'return-empty': true
      }, function(err, cells) {
        btcUsdCell = cells[0];
        console.log('Carregado célula BTC/USD');
      });

    sheet.getCells({'min-row': 2,'max-row': 2,'min-col': 10,'max-col': 10,'return-empty': true
      }, function(err, cells) {
        btcBrlCell = cells[0];
        console.log('Carregado célula BTC/BRL');
      });

  });

});

function getPoloniexCell(ex){
  var cell;
  switch(ex){
    case 'USDT_BTC':
      cell = btcUsdCell; break;
    case 'BTC_ETH':
      cell = priceCells[0]; break;
    case 'BTC_STR':
      cell = priceCells[1]; break;
    case 'BTC_XRP':
      cell = priceCells[2]; break;
    case 'BTC_ZEC':
      cell = priceCells[3]; break;
  }
  return cell;
}

connection.onopen = function (session) {
    console.log('Conexão efetuada (Poloniex)')
    function tickerEvent (args,kwargs) {
      if (priceCells && btcUsdCell){ // Somente se possuir as células de preços
        var cell = getPoloniexCell(args[0]);
        if (cell) {
          console.log(args[0], ' -> ', args[1])
          cell.value = args[1];
          cell.save();
        }
      }
    }
    session.subscribe('ticker', tickerEvent);
}

connection.onclose = function () {
  console.log("Websocket connection closed");
}

setInterval(tickerMercadoBitcoin, 15000); // Atualiza a cada 15 segundos

console.log('Abrindo conexão com a Poloniex...')
connection.open();
