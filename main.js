var canvas = document.getElementById("canvas");
var gl = null;
for (var i = 0; i < 4; i++) {
  gl = canvas.getContext(["webgl", "experimental-webgl", "moz-webgl", "webkit-3d"][i]);
  if (gl)
    break;
}

// prepare WebGL
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

var vs = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vs, "attribute vec2 vx;varying vec2 tx;void main(){gl_Position=vec4(vx.x*2.0-1.0,1.0-vx.y*2.0,0,1);tx=vx;}");
gl.compileShader(vs);

// fragment shader adds grayscale filter	
var ps = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(ps, "precision mediump float;uniform sampler2D sm;varying vec2 tx;void main(){vec4 color=texture2D(sm,tx); color.rgb = vec3(color.r+color.g+color.b)/3.0; gl_FragColor= color;}");
gl.compileShader(ps);

var shader = gl.createProgram();
gl.attachShader(shader, vs);
gl.attachShader(shader, ps);
gl.linkProgram(shader);
gl.useProgram(shader);

var vx_ptr = gl.getAttribLocation(shader, "vx");
gl.enableVertexAttribArray(vx_ptr);
gl.uniform1i(gl.getUniformLocation(shader, "sm"), 0);

// provide texture coordinates for the rectangle.
var vx = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vx);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), gl.STATIC_DRAW);

var ix = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ix);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);

// create texture	
var tex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, tex);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

// load the video
var video = document.getElementById("video");
var videoready = false;
video.autoplay = true;
video.muted = true;
video.oncanplay = function() {
  videoready = true;
};

// try to start playing
video.play();

var pause = false;

// requestAnimationFrame loop
function frameloop() {

  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);

  if (videoready) {
    // upload the video frame into texture
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, vx);
  gl.vertexAttribPointer(vx_ptr, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ix);
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

  if (pause) return;
  window.requestAnimationFrame(frameloop);
}

frameloop();


// audio
var audio = document.getElementById('soundtrack');
audio.play();

// scratch filter
window.onload = function() {
  var canvas = document.getElementById("filter"),
    context = canvas.getContext("2d"),
    width = canvas.width,
    height = canvas.height,
    fps = 15;

  function filterloop() {
    for (var i = 0; i < 30; i += 1) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.beginPath();
      context.moveTo(Math.random() * width, Math.random() * height);
      context.lineTo(Math.random() * width / 2, Math.random() * height / 2);
      context.strokeStyle = 'rgba(255,255,255,' + Math.random() + ')';
      context.stroke();

    }
    setTimeout(function() {
      window.requestAnimationFrame(filterloop)
    }, 1000 / fps);

  }
  filterloop();
};


// subtitles 
var trackElements = document.querySelectorAll("track");
var trackContainer = document.getElementById("subtitles");

for (var i = 0; i < trackElements.length; i++) {
  trackElements[i].addEventListener("load", function() {
    var textTrack = this.track;

    textTrack.oncuechange = function() {

      var cue = this.activeCues[0]; // get active subtitle cue

      if (cue !== undefined) {

        var cueLength;
        cueLength = (cue.endTime - cue.startTime) * 1000;
        
        // show subtitles after phrase
        setTimeout(function() {
          pause = true;
          video.pause();
          trackContainer.classList.add('subtitles_visible');
          var cueText = cue.text;
          trackContainer.innerHTML += cueText;
        }, cueLength);
        
        // hide subtitles after cueLength time period
        setTimeout(function() {
          pause = false;
          video.play();
          frameloop();
          trackContainer.classList.remove('subtitles_visible');
          trackContainer.innerHTML = '';
        }, cueLength * 2);
      }

    }
  })
}

// pause button
var pauseButton = document.getElementById('button__pause');
pauseButton.addEventListener("click", function() {
  pause = true;
  video.pause();
  audio.pause();
});

// play button
var playButton = document.getElementById('button__play');
playButton.addEventListener("click", function() {
  pause = false;
  video.play();
  audio.play();
  frameloop();
});

// stop audio on end
video.onended = function(){
  audio.pause();
  trackContainer.classList.add('subtitles_visible');
  trackContainer.innerHTML = 'Спасибо за просмотр!';
}