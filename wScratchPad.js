
(function($)
{
	$.fn.wScratchPad = function(option, settings)
	{
		if(typeof option === 'object')
		{
			settings = option;
		}
		else if(typeof option == 'string')
		{
			var values = [];

			var elements = this.each(function()
			{
				var data = $(this).data('_wScratchPad');

				if(data)
				{
					if(option === 'reset') { data.reset(); }
					else if(option === 'clear') { data.clear(); }
					else if(option === 'enabled') { data.enabled = settings === true; }
					else if($.fn.wScratchPad.defaultSettings[option] !== undefined)
					{
						if(settings !== undefined) { data.settings[option] = settings; }
						else { values.push(data.settings[option]); }
					}
				}
			});

			if(values.length === 1) { return values[0]; }
			if(values.length > 0) { return values; }
			else { return elements; }
		}
		
		settings = $.extend({}, $.fn.wScratchPad.defaultSettings, settings || {});

		return this.each(function()
		{
			var elem = $(this);
			var $settings = jQuery.extend(true, {}, settings);

			//test for HTML5 canvas
			var test = document.createElement('canvas');
			if(!test.getContext)
			{
				elem.html("Browser does not support HTML5 canvas, please upgrade to a more modern browser.");
				return false;	
			}

			var sp = new ScratchPad($settings, elem);
			
			elem.append(sp.generate());
			
			//get number of pixels of canvas for percent calculations 
			sp.pixels = sp.canvas.width * sp.canvas.height;
			
			elem.data('_wScratchPad', sp);
			
			sp.init();
		});
	};

	$.fn.wScratchPad.defaultSettings =
	{
		width		: 210,						// set width - best to match image width
		height		: 100,						// set height - best to match image height
		image		: null,		// set image path
		image2		: null,						// set overlay image path - if set color is not used
		color		: '#336699',				// set scratch color - if image2 is not set uses color
		overlay		: 'none',					// set the type of overlay effect 'none', 'lighter' - only used with color
		size		: 10,						// set size of scratcher
		scratchDown	: null,						// scratchDown callback
		scratchUp	: null,						// scratchUp callback
		scratchMove	: null,						// scratcMove callback
		cursor		: null,						// Set path to custom cursor

		backColor   : 'red',						// set backCanvas fillColor
		meaasge     : null,			// set backCanvas fillText
		font        : '16px',
		textAlign   : 'center',
		textBaseline: 'middle'
	};
	
	function ScratchPad(settings, elem)
	{
		this.sp = null;
		this.settings = settings;
		this.$elem = elem;
		
		this.enabled = true;
		this.scratch = false;
		
		this.canvas = null;
		this.ctx = null;
		
		return this;
	}
	
	ScratchPad.prototype = 
	{
		// 生成
		generate: function()
		{
			var $this = this;
			
			this.canvas = document.createElement('canvas');
			this.ctx = this.canvas.getContext('2d');

			this.backCanvas = document.createElement('canvas');
			this.backCtx = this.backCanvas.getContext('2d');

			// 生成画布
			this.sp =
			$('<div></div>')
			//.css({position: 'relative',"margin":"auto"})
			.append(
				$(this.backCanvas)
				.attr('width', this.settings.width + 'px')
				.attr('height', this.settings.height + 'px')
				.css({position: 'absolute',top : '0',left : '0'})
			)
			.append(
				$(this.canvas)
				.attr('width', this.settings.width + 'px')
				.attr('height', this.settings.height + 'px')
				.css({position: 'absolute',top : '0',left : '0'})

			);

			// 绑定事件
			$(this.canvas)
			.mousedown(function(e)
			{
				if(!$this.enabled) return true;

				e.preventDefault();
				e.stopPropagation();
				
				//reset canvas offset in case it has moved
				$this.canvas_offset = $($this.canvas).offset();
				
				$this.scratch = true;
				$this.scratchFunc(e, $this, 'Down');
			})
			.mousemove(function(e)
			{
				e.preventDefault();
				e.stopPropagation();
				
				if($this.scratch) $this.scratchFunc(e, $this, 'Move');
			})
			.mouseup(function(e)
			{
				e.preventDefault();
				e.stopPropagation();
				
				//make sure we are in draw mode otherwise this will fire on any mouse up.
				if($this.scratch)
				{
					$this.scratch = false;
					$this.scratchFunc(e, $this, 'Up');
				}
			});

			this.bindMobile(this.sp);
			
			return this.sp;
		},
		// 绑定移动设备事件
		bindMobile: function($el)
		{
			$el.bind('touchstart touchmove touchend touchcancel', function ()
			{
				var touches = event.changedTouches, first = touches[0], type = ""; 

				switch (event.type)
				{
					case "touchstart": type = "mousedown"; break; 
					case "touchmove": type = "mousemove"; break; 
					case "touchend": type = "mouseup"; break; 
					default: return;
				}

				var simulatedEvent = document.createEvent("MouseEvent"); 

				simulatedEvent.initMouseEvent(type, true, true, window, 1, first.screenX, first.screenY, first.clientX, first.clientY, false, false, false, false, 0/*left*/, null);
				first.target.dispatchEvent(simulatedEvent);
				event.preventDefault();
			});
		},

		init: function()
		{
			this.sp.css('width', this.settings.width);
			this.sp.css('height', this.settings.height);
			this.sp.css('cursor', (this.settings.cursor ? 'url("' + this.settings.cursor + '"), default' : 'default'));

			$(this.canvas).css({cursor: (this.settings.cursor ? 'url("' + this.settings.cursor + '"), default' : 'default')});
			
			this.canvas.width = this.settings.width;
			this.canvas.height = this.settings.height;
			
			this.pixels = this.canvas.width * this.canvas.height;


				//if(this.settings.overlay != 'none')
				//{
				if(this.settings.image)
				{
					this.drawImage(this.backCtx,this.settings.image);
				}else if(this.settings.backColor)
				{
					//this.backCtx.fillStyle = this.settings.backColor;
					//this.backCtx.beginPath();
					//this.backCtx.rect(0, 0, this.settings.width, this.settings.height);
					//this.backCtx.fill();
					this.drawRect(this.backCtx, this.settings.backColor);
				}

				if(this.settings.message)
				{
					this.drawText(this.backCtx,this.settings.message);
				}

				this.ctx.globalCompositeOperation = this.settings.overlay;
				//}
				//else
				//{
				//	if(this.settings.image)
				//	{
				//		this.drawImage(this.backCtx, this.settings.image);
				//	}
				//}

				//this.ctx.fillStyle = this.settings.color;
				//this.ctx.beginPath();
				//this.ctx.rect(0, 0, this.settings.width, this.settings.height);
				//this.ctx.fill();
				if(this.settings.image2)
				{
					this.drawImage(this.ctx,this.settings.image2);
				}
				else {
					this.drawRect(this.ctx, this.settings.color);
					//this.drawText(this.ctx,'woca');
				}

		},

		reset: function()
		{
			this.ctx.globalCompositeOperation = 'source-over';
			this.init();
		},

		clear: function()
		{
			this.ctx.clearRect(0, 0, this.settings.width, this.settings.height);
		},

		setBgImage: function()
		{
			if(this.settings.image)
			{
				//this.sp.css({backgroundImage: 'url('+this.settings.image+')'});
			}
		},

		drawRect: function(canvas,color)
		{
			canvas.fillStyle = color;
			canvas.beginPath();
			canvas.rect(0, 0, this.settings.width, this.settings.height);
			canvas.fill();
		},
		drawImage: function(canvas,imagePath)
		{
			var $this = this;
			var img = new Image();
  			img.src = imagePath;
  			$(img).load(function(){
				canvas.drawImage(img, 0, 0);
  				//$this.setBgImage();
  			})
		},

		drawText:function(canvas,message)
		{

			
			canvas.font = this.settings.font + ' sans-serif bold';
			// alert(canvas.font);
			canvas.textAlign = 'left';
			canvas.fillStyle = 'red';
			canvas.textBaseline = 'top';
			var metrics = canvas.measureText(message);
			var textWidth = this.settings.width / 2 - metrics.width / 2;
			var textHeight = this.settings.height / 2 - parseInt(canvas.font) / 2;
			canvas.fillText(message, textWidth, textHeight);
		},
		scratchFunc: function(e, $this, event)
		{
			e.pageX = Math.floor(e.pageX - $this.canvas_offset.left);
			e.pageY = Math.floor(e.pageY - $this.canvas_offset.top);
			
			$this['scratch' + event](e, $this);
			
			if($this.settings['scratch' + event]) $this.settings['scratch' + event].apply($this, [e, $this.scratchPercentage($this)]);
		},

		scratchPercentage: function($this)
		{
			var hits = 0;
			var imageData = $this.ctx.getImageData(0,0,$this.canvas.width,$this.canvas.height)
			
			for(var i=0, ii=imageData.data.length; i<ii; i=i+4)
			{
				if(imageData.data[i] == 0 && imageData.data[i+1] == 0 && imageData.data[i+2] == 0 && imageData.data[i+3] == 0) hits++;
			}
			
			return (hits / $this.pixels) * 100;
		},

		scratchDown: function(e, $this)
		{
			$this.ctx.globalCompositeOperation = 'destination-out';
			$this.ctx.lineJoin = "round";
			$this.ctx.lineCap = "round";
			$this.ctx.strokeStyle = $this.settings.color;
			$this.ctx.lineWidth = $this.settings.size;
			
			//draw single dot in case of a click without a move
			$this.ctx.beginPath();
			$this.ctx.arc(e.pageX, e.pageY, $this.settings.size/2, 0, Math.PI*2, true);
			$this.ctx.closePath();
			$this.ctx.fill();
			
			//start the path for a drag
			$this.ctx.beginPath();
			$this.ctx.moveTo(e.pageX, e.pageY);
		},
		
		scratchMove: function(e, $this)
		{
			$this.ctx.lineTo(e.pageX, e.pageY);
			$this.ctx.stroke();
		},
		
		scratchUp: function(e, $this)
		{
			$this.ctx.closePath();
		},
	}
})(jQuery);