# Gestos de uso de objetos

Cada archivo `Use*.json` de esta carpeta describe, pose por pose, el gesto con el que el avatar saca un objeto de la
mochila y lo usa. `tools/blender/gestos.py` lo resuelve y lo exporta como
`public/models-3d/animations/shared/<Clip>.glb`, un clip de solo esqueleto que comparten los 12 avatares.

## Ver un gesto sin abrir el juego

```bash
python tools/blender/gesto.py UseSlash                 # poses clave y cuadros intermedios
python tools/blender/gesto.py UseSlash --cuadros todos # todos los cuadros (30 por segundo)
python tools/blender/gesto.py UseSlash --cada 2        # uno de cada 2, mas las poses clave
python tools/blender/gesto.py UseSlash --cuadros 4,5,6,7,8 --personaje Enano
```

Imprime una tabla con las medidas de cada cuadro y los avisos anatomicos, y deja en la carpeta de trabajo
(`%TEMP%\brillo-gestos\<Clip>\`, o la que se pase con `--trabajo`):

- `hoja_N.jpg`: columnas = cuadros; filas = de frente, de lado (desde la derecha del personaje), `juego` (como lo ve
  el jugador: la camara va detras y algo por encima) y desde arriba.
- `detalle.jpg`: la mano con el objeto, de cerca, desde cuatro lados.

Personajes: Humana (por defecto), Elfa, Enana, Gnoma, Draconia, Tiflina, Humano, Elfo, Enano, Gnomo, Draconiano, Tiflin.

Despues de cambiar un gesto: `python tools/blender/gestos_ts.py` regenera `src/game/player/gestureTable.ts`, con lo
que el juego cuelga el objeto de la mano igual que la vista previa.

## Formato

```json
{
  "nombre": "UseSlash",
  "descripcion": "Que hace el avatar, en una frase.",
  "brazos": "derecho",
  "objeto": { "modelo": "public/models-3d/...glb", "mano": "derecha", "largo": 0.95, "agarre": "extremo",
              "hacia": "filo", "invertir": true, "giro": 0, "empunadura": 0.1, "desplazar": [0, 0, 0],
              "visible": [0.03, 0.8], "detalle": 9 },
  "claves": [
    { "t": 0.0 },
    { "t": 0.2,
      "torso": { "Spine": { "yaw": -8 }, "Spine1": { "yaw": -10, "pitch": -3 }, "Head": { "yaw": 12 } },
      "derecho": { "mano": [-0.05, -0.35, 0.5], "ref": "hombro", "codo": [0, -0.95, -0.3],
                   "filo": [-0.45, -0.15, 0.88], "nudillos": [0.2, 0, 1], "cierre": 1,
                   "hombro": { "sube": 8, "adelanta": 0 } },
      "izquierdo": { "mano": [0.5, 0.1, -0.2], "codo": [-0.2, 0.7, -0.6], "cierre": 0.5 } },
    { "t": 0.95 }
  ]
}
```

Todos los vectores van en ejes del cuerpo: **(adelante, izquierda, arriba)**. La derecha del personaje es
`izquierda` negativa. Los ejes no giran con el torso.

### General

- `brazos`: `"derecho"`, `"izquierdo"` o `"ambos"`. El brazo que no se indica **no lo mueve el gesto**: en el juego
  sigue balanceandose con la caminata. Usa `"ambos"` solo si el otro brazo participa de verdad.
- `efecto`: segundo del gesto en que el objeto hace lo suyo (la gema sale de la mano, se aprieta el frasco). El juego
  aplica el efecto del objeto en ese instante, no al pulsar la tecla.
- `claves`: poses clave ordenadas por `t` (segundos). La primera y la ultima deben ser la pose base (`{ "t": ... }`
  sin nada mas): el juego entra al gesto en 0,12 s y sale en 0,20 s mezclando con lo que el avatar estuviera
  haciendo. Entre claves los valores siguen una curva suave que pasa por todas; se detiene (velocidad cero) en la
  primera, en la ultima y donde dos claves seguidas valen lo mismo (una pausa). Para un movimiento seco, acerca las
  claves en el tiempo; para que una pose "pese", repitela en dos claves seguidas.
- Lo que una clave no menciona vuelve a la pose base (el Idle), no se queda como estaba en la clave anterior.

### Torso y cabeza (`torso`)

Grados respecto a la pose base, por hueso: `Spine`, `Spine1`, `Spine2`, `Neck`, `Head`.

- `pitch`: positivo inclina hacia delante. `yaw`: positivo gira a la izquierda. `roll`: positivo ladea a la derecha.
- Los giros se suman a lo largo de la columna: reparte un giro del torso entre `Spine`, `Spine1` y `Spine2`.
- Las caderas y las piernas no se mueven (las lleva la caminata): el peso se sugiere con el torso.

### Brazos (`derecho`, `izquierdo`)

Cinematica inversa: se dice donde va la muneca y hacia donde apunta el codo; el brazo solo dobla por su bisagra.

- `mano`: posicion de la **muneca**, en **largos de brazo** (hombro a muneca = 1), medida desde `ref`.
  - `ref` = `"hombro"` (el de ese brazo; por defecto), `"pecho"` (un poco delante del esternon), `"cabeza"` (base
    del craneo), `"ojo"` (el de ese lado, en la superficie de la cara), `"cadera"`, `"mochila"` (media espalda, por
    detras) u `"otra_mano"` (la muneca del otro brazo).
  - Desde el hombro, el brazo colgando es `[0, 0, -1]` y estirado al frente `[1, 0, 0]`. Mas alla de 1 no llega.
- `codo`: hacia donde apunta el codo (direccion). Brazo derecho relajado: abajo, afuera y algo atras, p. ej.
  `[-0.3, -0.6, -0.75]`. Con el brazo levantado, el codo apunta afuera (`[0, -1, -0.2]`).
- Muneca (opcional; si no se indica, la mano prolonga el antebrazo, con la palma como en reposo):
  - `nudillos`: hacia donde miran los nudillos (la direccion de un punetazo).
  - `filo`: hacia donde sale un objeto empunado por el lado del pulgar (la hoja de una espada, el cuello de una
    botella). O bien `palma`: hacia donde mira la palma (`[0, 0, 1]` = palma arriba).
- `cierre`: dedos, de 0 (mano abierta) a 1 (puno). Sostener algo: 0.8 a 1. En reposo: 0.2.
- `hombro`: `sube` y `adelanta`, en grados. Si no se indica `sube`, la clavicula acompana sola al brazo cuando sube.

### Objeto (`objeto`)

- `mano`: `"derecha"` o `"izquierda"`. `largo`: lo que mide su lado mas largo, en metros, junto a un personaje de
  1,70 m. `visible`: [desde, hasta], segundos del gesto en que esta en la mano (antes esta en la mochila; despues
  se guardo o se lanzo).
- Orientacion en la mano: su lado mas largo va a lo largo de `hacia`: `"filo"` (el agarre: sale por el lado del
  pulgar, como una espada o una linterna; por defecto), `"nudillos"` (a lo largo de la mano, como un guante) o
  `"palma"` (sale perpendicular a la palma). `invertir` le da la vuelta de punta a punta; `giro` lo gira en grados
  alrededor de ese eje.
- `agarre`: `"centro"` (la mano lo coge por la mitad) o `"extremo"` (por una punta; `empunadura` = metros desde esa
  punta hasta el centro del puno).
- `desplazar`: ajuste fino en metros: [a lo largo del filo, hacia los nudillos, hacia fuera de la palma].
- `detalle`: cuadro que se usa para `detalle.jpg` (por defecto, la mitad del tiempo en que es visible).

## Como leer las medidas

- `muneca`: posicion respecto a la cadera, en metros (personaje de 1,70 m): adelante, izquierda, arriba.
- `codo`: grados de flexion (0 = brazo recto; ~145 = cerrado del todo).
- `alcance`: cuanto pide del largo del brazo (mas de 1 = no llega).
- `mun.dobl`: grados que la mano se desvia del antebrazo (comodo hasta ~45; maximo ~65).
- `supin`: giro del antebrazo. 0 = palma abajo con el brazo en cruz (pronado); ~90 = pulgar arriba (neutro);
  ~170 = palma arriba. Fuera de [-25, 165] no es posible.
- `vel`: velocidad de la muneca, m/s. Un golpe o un lanzamiento tienen un pico claro; una pausa es ~0.
- `punta` y `filo`: donde esta la punta del objeto empunado por un extremo y hacia donde apunta.

Los avisos anatomicos senalan posturas que un cuerpo no puede hacer o cosas que se atraviesan. Un gesto bueno no
deja ninguno (o los justifica: el cuadro de entrada y salida pueden rozar un limite un instante).
