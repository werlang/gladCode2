$(document).ready( function(){
	$('#support input').click( function(){
		if ($('#support #one-time:checked').length)
			$('#support #method').slideDown();
		else{
			$('#support #method').fadeOut();
			$('#support #method input').prop('checked', false);
		}

		$('#support .donate').addClass('hidden');
		$('#support #buttons').hide();

		if ($('#support #crypto:checked').length)
			$('#support #bitcoin, #support #ethereum').removeClass('hidden');
		if ($('#support #boleto:checked').length + $('#support #card:checked').length)
			$('#support #pagseguro').removeClass('hidden');
		if ($('#support #monthly:checked').length + $('#support #card:checked').length)
			$('#support #paypal').removeClass('hidden');

		$('#support #buttons').slideDown('fast');
	});

	$('#support .donate.small').click( function(){
		var id = $(this).attr('id');

		if (id == 'ethereum')
			showWallet("eth");
		else if (id == 'bitcoin')
			showWallet("btc");
	});

	$('.discontinued').click( () => {
		create_tooltip("Este modo não existe mais na gladCode. Os torneio agora podem ser criados a partir do peril do usuário.", $('.discontinued'));
	});

	$('#paypal, #pagseguro').click( function(){
		$.post("back_thanks.php",{
			action: "SET",
			url: window.location.pathname
		}).done( function(data){
			//console.log(data);
		});
	});
	
});

function showWallet(curr){
	var data = {
		btc: {
			name: "Bitcoin",
			wallet: "351JhGwhqGckt6P4F8cSsFCgsHKHCU8tjD",
			icon: "icon/bitcoin.png",
			qrcode: "image/qr_btc.png"
		},
		eth: {
			name: "Ethereum",
			wallet: "0x50E9BBf49C6329FC97493d012fEBB4D04d5de37e",
			icon: "icon/ethereum.png",
			qrcode: "image/qr_eth.png"
		}
	};

	if ($('#crypto-box').length == 0){
		var wallet = data[curr].wallet;
		var prettyArray = {
			btc: [4,4,4,5,4,4,4,5],
			eth: [4,4,4,4,5,4,4,4,4,5]
		};
		var walletpretty = "";
		var start = 0;
		for (var i in prettyArray[curr]){
			walletpretty += wallet.substring(start, start + prettyArray[curr][i]);
			start += prettyArray[curr][i];
			if (i < prettyArray[curr].length-1)
				walletpretty += " ";
		}

		//var wallet = walletpretty.split(" ").join("");
		var qrcode = "<img src='"+ data[curr].qrcode +"'>";
		var box = "<div id='fog'><div id='crypto-box' class='size-"+ prettyArray[curr].length +"'><div id='close'>X</div><div id='title'>Carteira "+ data[curr].name +":</div><div id='qrcode'>"+ qrcode +"</div><div id='wallet' title='Copiar para área de transferência'><img src='"+ data[curr].icon +"'><span>"+ walletpretty +"</span></div></div></div>";

		$('body').append(box);
		$('#crypto-box').hide().fadeIn();
		$('#crypto-box #close').click(function(){
			$('#fog').remove();
		});

		$('#crypto-box #wallet').click(function(){
			var textObj = $('#crypto-box #wallet span');
			copyToClipboard(wallet);
			textObj.parent().addClass('copied');
			textObj.html("Copiado").fadeOut(1200, function(){
				textObj.parent().removeClass('copied');
				textObj.html(walletpretty).show();
			});
		});

	}
}

function copyToClipboard(text) {
	$('body').append("<input type='text' id='icopy' value='"+ text +"'>");
	$('#icopy').select();
	document.execCommand("copy");
	$('#icopy').remove();
}	