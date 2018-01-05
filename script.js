function changeFont()
{
  var strings = [", I", " am", " the", " mountain"];
  var i = 0;
  var title  = document.queryselector("#mainTitle");
  title.innerHTML += strings[i];
  if (i < strings.length)
    {
      i++;
    }
}
   var parameters = {
  target: '#myFunction',
  data: [{
    fn: 'sin(x)', 
    color: 'black'
 }       
        ],
  grid: true,
  yAxis: {domain: [-1.2, 1.2]},
  xAxis: {domain: [-6, 6]}
};

functionPlot(parameters);