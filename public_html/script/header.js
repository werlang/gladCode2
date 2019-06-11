$(document).ready( function() {
	$('#menu-button').click( function() {
		$('body').append("<div id='fog'><div id='menu'></div></div>");
		$('#fog #menu').html("<a href='index.php'><img src='icon/logo.png'></a>"+ $('#h-items').html());
		
		$('#fog').click( function() {
			$('#fog #menu').toggle("slide", 300, function() {
				$('#fog').remove();
			});
		});
		$('#fog #menu').click( function(e) {
			e.stopPropagation();
		});
		$('#fog #login').click( function(){
			googleLogin().then( function(data){
				window.location.href = "profile";
			});
		});	
		
		$('#fog #menu').toggle("slide", 300); //precisa jquery ui
	});
	
	$('.drop-menu').hover( function() {
		menu_open($(this));
	});
	$('.drop-menu').mouseleave( function() {
		menu_close();
	});
	$('.drop-menu').click( function() {
		menu_close();
		menu_open($(this));
	});
	function menu_open(element){
		$('.item-container').hide();
		if ($('.item-container.open').length == 0){
			element.find('.item-container').slideDown();
			element.find('.item-container').addClass('open');
			element.find('.item-container').css({'left': element.position().left, 'top': element.position().top + element.height()});
		}
	}
	function menu_close(){
		$('.item-container').hide();
		$('.item-container').removeClass('open');
	}
	
	initGoogleLogin();

	$('.mobile #login, .desktop #login').click( function(){
		googleLogin().then( function(data){
			window.location.href = "profile";
		});
	});	
	
	$.post("back_login.php", {
		action: "GET"
	}).done( function(data){
		//console.log(data);
		if (data == "NULL")
			$('.mobile #profile, .desktop #profile').hide();
		else
			$('.mobile #login, .desktop #login').hide();
	});

	$('#footer #ethereum').click( function(){
		showWallet("eth");
	});

	$('#footer #bitcoin').click( function(){
		showWallet("btc");
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

