var EUGEN = {};
(function(){
  var e0 = 8.854187817e-12 * 10e10,
      e = 1.602176565e-19,
      Na = 6.0221415e23,
      sqrt = Math.sqrt,
      convertFactor = 10e17,
      square = function(a) {
        return Math.pow(a, 2);
      },
      distance = function(a,b){
        return sqrt(square(a.x - b.x) + square(a.y - b.y) + square(a.z - b.z));
      },
      point = vectorConstructor("x","y","z");

  function roundToZero(num){
    return roundTo(num, 10e10);
  }

  function roundTo(num, to){
    return Math.round(num * to) / to;
  }

  function getXYZComponents(a, b, c, alpha, beta, gama){
    var cos = Math.cos, sin = Math.sin,
        cy = roundToZero(c * (cos(alpha) - cos(beta) * cos(gama)) / sin (gama));
    return {
        a: point(a,a,a),
        b: point(roundToZero(b * cos(gama)), roundToZero(b * sin(gama)), 0),
        c: point(roundToZero(c * cos(beta)), cy, roundToZero(c * sqrt(square(sin(beta)) - square(cy/c))))
      };
  }

  function combinatorMap(rangeMin, rangeMax, func){
    var arr = [];
    for(var x = rangeMin; x<rangeMax+1; x++){
      for(var y = rangeMin; y<rangeMax+1; y++){
        for(var z = rangeMin; z<rangeMax+1; z++){
          arr.push(func(x,y,z));
        }
      }
    }
    return arr;
  }

  EUGEN.countEes = function(ions, refIonIndex, cellParams, expRange, isDebug){
    var refIon = ions[refIonIndex],
        abs = Math.abs,
        a = cellParams.a, b = cellParams.b, c = cellParams.c,
        alpha = cellParams.alpha, beta = cellParams.beta, gama = cellParams.gama,
        refIonComps = getXYZComponents(a,b,c,alpha,beta,gama),
        prefix = convertFactor *  (Na * square(e)) / (4 * Math.PI * e0);

    if(isDebug){
      console.log("convertFactor *  (Na * square(e)) / (4 * Math.PI * e0) = ", prefix, " ,where");
      console.log({convertFactor:convertFactor, Na:Na, square_e:square(e), e0:e0});
    }

    var results = [], comulSum = 0, minR = Number.MAX_VALUE;
    for(var growIndex = 0; growIndex < expRange; growIndex++){
      var count = 0, debugPoints = [];

      comulSum += combinatorMap(-growIndex, growIndex, function(j, k, l){
        if(isDebug){
          count += ions.length;
        }
        return ions.map(function(ion, index){
          var isInitialCell = j == 0 && k == 0 && l == 0,
            isRefIonInBaseCell = index == refIonIndex && isInitialCell,
            notSurfaceCell = growIndex > 0 && abs(j) < growIndex && abs(k) < growIndex && abs(l) < growIndex;
          if(isRefIonInBaseCell || notSurfaceCell){
            //Don't count distance for cell not on surface of expanding box. For inner boxes distance already in
            //comulSum variable.
            return 0;
          }

          var shiftVector = point(
                j * refIonComps.a.x - k * refIonComps.b.x - l * refIonComps.c.x,
                k * refIonComps.b.y - l * refIonComps.c.y,
                l * refIonComps.c.z);
          var transIon = point(
                ion.x + shiftVector.x,
                ion.y + shiftVector.y,
                ion.z + shiftVector.z);
          var r = distance(refIon, transIon);

          if(isInitialCell && r < minR){
            minR = r;
          }

          if(isDebug){
            debugPoints.push([roundTo(transIon.x, 10e4), roundTo(transIon.y, 10e4), roundTo(transIon.z, 10e4),
                shiftVector.x + " (" + j + ")", shiftVector.y+ " (" + k + ")", shiftVector.z+ " (" + l + ")",
                index, ion.value, roundTo(r, 10e4),  roundTo(ion.value / r, 10e4)]);
          }

          return ion.value / r;
        }).sum();
      }).sum();

      var totalWeightedDistance = refIon.value * comulSum,
        energy = prefix * totalWeightedDistance,
        madelung = minR * totalWeightedDistance;

      if(isDebug){
        results.push([count, growIndex, energy, debugPoints, roundTo(comulSum, 10e4)]);
      }else{
        results.push([energy, madelung]);
      }

    }
    
    return results;
  }
}());

