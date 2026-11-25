// The cells of the tables below are written as [cell, cell] pairs of JSX: they are table data, not lists of siblings,
// and Tabla gives each row its key.
/* oxlint-disable react/jsx-key */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useUIStore } from '@/store/uiStore';

// The user manual of the game, written for students (and, at the end, for the DEXIA administrators). It is shown in
// two places with the same content: as a window over any screen (ManualModal, opened with ManualButton) and as a page
// of its own (/manual, ManualPage). Everything uses the palette of the game (index.css): parchment, wood, gold, moss.

type Section = { id: string; title: string; body: ReactNode };

const H3 = 'font-serif font-bold text-base sm:text-lg text-madera-800 mt-5 mb-1.5';
const P = 'text-sm sm:text-[15px] leading-relaxed text-madera-800 mb-3';
const UL = 'text-sm sm:text-[15px] leading-relaxed text-madera-800 mb-3 space-y-1.5 list-disc pl-5 marker:text-oro-600';
const OL = 'text-sm sm:text-[15px] leading-relaxed text-madera-800 mb-3 space-y-1.5 list-decimal pl-5 marker:font-bold marker:text-madera-600';

// A key of the keyboard, drawn like the quick-bar shortcuts.
function Tecla({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-7 h-7 px-1.5 mx-0.5 rounded-md bg-papel-50 border-2 border-madera-600 text-madera-800 text-xs font-bold font-sans shadow-[0_2px_0_var(--color-madera-600)] align-middle">
      {children}
    </kbd>
  );
}

function Nota({ tone = 'oro', title, children }: { tone?: 'oro' | 'musgo' | 'carmesi'; title: string; children: ReactNode }) {
  const tones = {
    oro: 'bg-oro-300/25 border-oro-600 text-madera-800',
    musgo: 'bg-musgo-50 border-musgo-600 text-madera-800',
    carmesi: 'bg-carmesi-claro border-carmesi text-madera-800',
  } as const;
  return (
    <aside className={`mb-4 rounded-xl border-l-4 px-4 py-3 text-sm leading-relaxed ${tones[tone]}`}>
      <strong className="block font-serif text-[15px] mb-0.5">{title}</strong>
      {children}
    </aside>
  );
}

function Figura({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  return (
    <figure className="my-4">
      <img
        src={`/manual/${src}.jpg`}
        alt={alt}
        loading="lazy"
        className="w-full rounded-xl border-2 border-madera-600 shadow-[0_6px_16px_rgba(62,39,35,0.3)] bg-madera-900"
      />
      <figcaption className="mt-1.5 text-xs text-madera-500 italic text-center">{caption}</figcaption>
    </figure>
  );
}

// Two-column table: what to press and what it does.
function Tabla({ head, rows }: { head: [string, string]; rows: [ReactNode, ReactNode][] }) {
  return (
    <div className="mb-4 overflow-hidden rounded-xl border-2 border-madera-600/70">
      <table className="w-full text-sm text-left text-madera-800">
        <thead className="bg-madera-600 text-papel-100 font-serif">
          <tr>
            <th className="px-3 py-2 font-bold w-[42%]">{head[0]}</th>
            <th className="px-3 py-2 font-bold">{head[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([a, b], index) => (
            <tr key={index} className={index % 2 ? 'bg-papel-200/60' : 'bg-papel-50'}>
              <td className="px-3 py-2 align-top font-semibold">{a}</td>
              <td className="px-3 py-2 align-top">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const Estrella = () => <span className="text-oro-600" aria-hidden="true">★</span>;

const SECTIONS: Section[] = [
  {
    id: 'que-es',
    title: '1. Qué es Brillo en la montaña',
    body: (
      <>
        <p className={P}>
          <strong>Brillo en la montaña</strong> es un videojuego de aventura en 3D de la Dirección de Desarrollo Estudiantil y Éxito Académico
          (DEXIA) de la Universidad del Valle, hecho para sus estudiantes de pregrado. Se juega en el navegador, en computador o en celular, sin
          instalar nada.
        </p>
        <p className={P}>
          Alguien robó el cáliz de madera que mantenía fértil la tierra de la Villa de Boj. Tu misión es recuperarlo: cruzar el Pantano de la
          Tristeza, atravesar el Bosque de la Oscuridad y subir por los túneles de una mina hasta la Cumbre, donde está el santuario que lo guarda.
        </p>
        <Nota title="La idea del juego">
          A la cumbre no se llega solo con fuerza. En cada tramo hay alguien que te ofrece su ayuda: quien la acepta recibe indicaciones y los
          objetos que necesita. Pedir ayuda a tiempo es parte de avanzar, en el juego y en la universidad.
        </Nota>
      </>
    ),
  },
  {
    id: 'requisitos',
    title: '2. Qué necesitas',
    body: (
      <>
        <ul className={UL}>
          <li>
            Tu <strong>cuenta de correo institucional</strong> (<em>@correounivalle.edu.co</em>). Otras cuentas no pueden entrar.
          </li>
          <li>
            Un navegador actualizado: <strong>Google Chrome</strong> o Microsoft Edge en computador y Android; <strong>Safari</strong> en iPhone y iPad.
          </li>
          <li>Conexión a internet estable. La primera carga del mundo descarga los modelos y puede tardar más en celular.</li>
          <li>Audífonos o parlantes: la historia y los personajes tienen narración.</li>
        </ul>
        <p className={P}>
          El juego elige solo el modo gráfico que soporta tu equipo, así que no hay nada que configurar. Tu avance se guarda automáticamente en
          tu cuenta: puedes cerrar y volver después, en el mismo equipo o en otro.
        </p>
      </>
    ),
  },
  {
    id: 'ingreso',
    title: '3. Ingreso y registro',
    body: (
      <>
        <ol className={OL}>
          <li>
            Abre el juego y presiona <strong>Iniciar Sesión con Cuenta Institucional</strong>. Elige tu cuenta <em>@correounivalle.edu.co</em> en la
            ventana de Google.
          </li>
          <li>
            La primera vez aparece el formulario <strong>Completa tu Registro Estudiantil</strong>. Tu nombre y tu correo ya vienen escritos. Escribe los
            7 dígitos finales de tu código y elige tu sede, tu facultad y tu programa.
          </li>
          <li>
            Lee el aviso de <strong>Tratamiento de Datos Personales</strong> (Ley 1581 de 2012) con el enlace <em>Consultar términos</em> y marca la
            casilla de autorización. Tus datos son de uso exclusivamente institucional y no se divulgan.
          </li>
          <li>
            Presiona <strong>Completar Registro y Continuar</strong>.
          </li>
        </ol>
        <Figura src="ingreso" alt="Portada de inicio de sesión del juego" caption="Portada de ingreso con la cuenta institucional." />
        <Figura src="registro" alt="Formulario de registro estudiantil" caption="Registro estudiantil: solo se diligencia la primera vez." />
        <p className={P}>Las siguientes veces entras directo al punto donde quedaste.</p>
      </>
    ),
  },
  {
    id: 'personaje',
    title: '4. Crea tu aventurero',
    body: (
      <>
        <ol className={OL}>
          <li>
            Elige si tu aventurero será <strong>mujer</strong> u <strong>hombre</strong>.
          </li>
          <li>
            Recorre los seis personajes con las flechas del carrusel: Draconiana o Draconiano, Elfa o Elfo, Enana o Enano, Gnoma o Gnomo, Humana o
            Humano y Tiflin. Todos juegan igual; cambia su aspecto y su estatura.
          </li>
          <li>
            Escribe el <strong>nombre de tu aventurero</strong> (hasta 16 caracteres) y presiona <strong>Comenzar Aventura</strong>.
          </li>
        </ol>
        <Figura src="personaje" alt="Pantalla Crea tu Aventurero" caption="Usa las flechas para ver los seis personajes antes de elegir." />
        <Nota tone="carmesi" title="Elige con calma">
          El personaje no se puede cambiar después. Solo se reemplaza si lo pierdes por un tercer bajo rendimiento (sección 9), y ese personaje ya
          no se puede volver a escoger. El nombre sí lo puedes cambiar cuando quieras desde tu perfil.
        </Nota>
        <p className={P}>
          La primera vez que entras al mundo se reproduce un <strong>video introductorio</strong> que cuenta el robo del cáliz. Se ve una sola vez y no
          se puede saltar: sube el volumen.
        </p>
      </>
    ),
  },
  {
    id: 'controles',
    title: '5. Cómo moverte',
    body: (
      <>
        <h3 className={H3}>En computador</h3>
        <Tabla
          head={['Tecla o ratón', 'Qué hace']}
          rows={[
            [<><Tecla>W</Tecla><Tecla>A</Tecla><Tecla>S</Tecla><Tecla>D</Tecla> o las flechas</>, 'Caminar'],
            [<><Tecla>Shift</Tecla> mientras caminas</>, 'Correr'],
            [<Tecla>Espacio</Tecla>, 'Saltar'],
            ['Arrastrar con el ratón', 'Girar la cámara alrededor de tu personaje'],
            [<Tecla>E</Tecla>, 'Interactuar: hablar, leer, recoger un objeto o empezar una acción'],
            [<><Tecla>1</Tecla><Tecla>2</Tecla><Tecla>3</Tecla></>, 'Usar el objeto de esa casilla de la barra rápida'],
            [<Tecla>M</Tecla>, 'Abrir o cerrar el mapa del viaje'],
            [<Tecla>Esc</Tecla>, 'Cerrar el mapa, el perfil o este manual'],
          ]}
        />
        <h3 className={H3}>En celular</h3>
        <p className={P}>
          El juego se usa con el teléfono <strong>en horizontal</strong>. Si ves el aviso «Gira tu celular», gíralo; si no cambia, tu teléfono tiene
          bloqueado el giro de la pantalla: el mismo aviso muestra, paso a paso, cómo quitarlo en iPhone y en Android. El video introductorio se puede ver con el
          teléfono en cualquier posición.
        </p>
        <Tabla
          head={['Control en pantalla', 'Qué hace']}
          rows={[
            ['Palanca de la izquierda', 'Caminar; llévala hasta el borde para ir más rápido'],
            ['Deslizar el dedo por la pantalla', 'Girar la cámara'],
            [<strong>CORRER</strong>, 'Tócalo una vez para correr; cambia a CAMINAR y, al tocarlo otra vez, vuelves a caminar'],
            [<strong>SALTAR</strong>, 'Saltar'],
            ['Botón de acción', 'Aparece cuando hay algo con qué interactuar; hace lo mismo que la tecla E'],
            ['Casillas de la barra rápida', 'Tocar una casilla usa ese objeto'],
            ['Minimapa', 'Tocarlo abre el mapa del viaje'],
          ]}
        />
        <Figura src="celular" alt="El juego en un celular en horizontal" caption="En celular: palanca a la izquierda y botones Correr y Saltar a la derecha." />
        <Nota tone="musgo" title="Cuando puedes hacer algo, el juego te avisa">
          Al acercarte a un personaje, un tablón o un objeto aparece un aviso como «Presiona E para hablar con la aldeana». Si no aparece, acércate un
          poco más.
        </Nota>
      </>
    ),
  },
  {
    id: 'pantalla',
    title: '6. Qué hay en la pantalla',
    body: (
      <>
        <Figura src="hud" alt="Pantalla del juego con sus indicadores" caption="Indicadores de la partida." />
        <Tabla
          head={['Dónde', 'Qué es']}
          rows={[
            ['Arriba a la izquierda', <>Tu <strong>barra de vida</strong> (de 0 a 100) y tus <strong>estrellas</strong> <Estrella /><Estrella /><Estrella />. Si ganaste estrellas extra, aparecen junto a ellas.</>],
            ['Debajo de la vida', <>Indicadores del desafío actual, por ejemplo la <strong>barra de hambre</strong> en el bosque.</>],
            ['Arriba a la derecha', <>Sonido, <strong>mochila</strong>, tu perfil, este manual y el botón <strong>Salir</strong>.</>],
            ['Abajo a la izquierda', <>El <strong>minimapa</strong>: la flecha roja eres tú y el punto dorado que late es tu siguiente destino.</>],
            ['Abajo a la derecha', <>La <strong>barra rápida</strong> con los objetos que llevas y su número (1, 2, 3).</>],
            ['Abajo, al centro', <>Los <strong>pergaminos</strong> con lo que dicen los personajes y el narrador.</>],
          ]}
        />
        <h3 className={H3}>Diálogos y decisiones</h3>
        <p className={P}>
          Los pergaminos se leen y se escuchan. Haz clic o toca el pergamino para pasar a la página siguiente. Algunos terminan con una pregunta y dos
          botones: esa es <strong>una decisión tuya</strong> y cambia lo que pasa después.
        </p>
        <Figura src="decision" alt="Pergamino con una decisión de aceptar o rechazar ayuda" caption="Una decisión: aceptar o rechazar la ayuda." />
        <h3 className={H3}>Sonido</h3>
        <p className={P}>
          El ícono del parlante abre el panel de sonido, con barras separadas para el volumen general, las narraciones, la música, el ambiente y los
          efectos.
        </p>
      </>
    ),
  },
  {
    id: 'mochila',
    title: '7. La mochila y los objetos',
    body: (
      <>
        <p className={P}>
          El botón de la mochila (arriba a la derecha) muestra <strong>«Qué debes hacer»</strong>, que es tu objetivo actual, y los objetos del desafío
          en el que estás. Cada desafío tiene tres.
        </p>
        <Figura src="mochila" alt="Mochila con tres objetos" caption="La mochila: tu objetivo y el estado de cada objeto." />
        <ul className={UL}>
          <li>
            Un objeto <strong>apagado</strong> todavía no lo tienes; la mochila te da una pista de dónde está.
          </li>
          <li>
            Para <strong>recoger</strong> un objeto, acércate y presiona <Tecla>E</Tecla> (o el botón de acción).
          </li>
          <li>
            Para <strong>usarlo</strong>, presiona su número (<Tecla>1</Tecla>, <Tecla>2</Tecla> o <Tecla>3</Tecla>) o toca su casilla en la barra rápida.
            Cada objeto sirve contra un peligro concreto: úsalo cerca de ese peligro.
          </li>
          <li>Después de usar un objeto, el juego te dice en un aviso qué pasó. Léelo: suele decirte qué falta.</li>
        </ul>
        <Nota title="Sin objetos no hay cómo defenderse">
          Los objetos se consiguen en la casa de quien te ofrece ayuda. Si rechazas la ayuda, la casa queda cerrada. Siempre puedes volver a hablar
          con ese personaje y aceptarla.
        </Nota>
      </>
    ),
  },
  {
    id: 'mapa',
    title: '8. El mapa del viaje',
    body: (
      <>
        <p className={P}>
          El <strong>minimapa</strong> muestra lo que te rodea. Con <Tecla>M</Tecla>, o tocándolo, se abre el <strong>mapa completo</strong> con su
          leyenda.
        </p>
        <Figura src="mapa" alt="Mapa completo del viaje" caption="El mapa del viaje: se destapa a medida que avanzas en la historia." />
        <ul className={UL}>
          <li>El mapa empieza oscuro. Cada vez que aceptas una ayuda o superas un desafío se destapa la zona siguiente.</li>
          <li>
            El <strong>punto dorado que late</strong> es tu siguiente destino. Si queda fuera del minimapa, una punta dorada en el borde señala hacia
            dónde caminar.
          </li>
          <li>Al pasar el ratón por un punto del mapa completo aparece el nombre del lugar.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'vidas',
    title: '9. Vida, estrellas y bajos rendimientos',
    body: (
      <>
        <p className={P}>
          Los enemigos y los peligros te quitan <strong>vida</strong>. Cuando llega a cero, el juego lo llama un <strong>bajo rendimiento</strong>, como en
          la universidad, y pierdes una de tus tres estrellas. Un bajo no es el final: es un aviso para cambiar de estrategia.
        </p>
        <Tabla
          head={['Qué pasa', 'Qué significa']}
          rows={[
            [<>Primer bajo <Estrella /><Estrella /></>, 'Vuelves al inicio del desafío y conservas lo que ya lograste. Todavía estás a tiempo de recuperarte.'],
            [<>Segundo bajo <Estrella /></>, 'Vuelves a la Villa de Boj y la aventura empieza de nuevo. Te queda una estrella.'],
            ['Tercer bajo', 'Pierdes a tu personaje. Eliges otro y empiezas desde el principio con tres estrellas.'],
            ['Tienes una estrella extra', 'Si te derrotan, pierdes la estrella extra en lugar de caer en bajo rendimiento.'],
          ]}
        />
        <Figura src="bajo" alt="Aviso de primer bajo rendimiento" caption="Aviso de primer bajo: quedan dos estrellas." />
        <Nota tone="musgo" title="Cómo evitar un bajo">
          Acepta la ayuda que te ofrecen, recoge <strong>todos</strong> los objetos antes de entrar a una zona peligrosa y revisa la mochila si no sabes
          qué sigue. Si ya caíste en uno, piensa qué te faltaba antes de volver a intentarlo.
        </Nota>
      </>
    ),
  },
  {
    id: 'aventura',
    title: '10. La aventura paso a paso',
    body: (
      <>
        <p className={P}>Esta guía te orienta sin contarte las soluciones. En todos los desafíos el orden es el mismo: hablar, aceptar la ayuda, recoger los objetos y usarlos.</p>
        <h3 className={H3}>Desafío 1: Villa de Boj y Pantano de la Tristeza</h3>
        <ol className={OL}>
          <li>Lee el <strong>anuncio del alcalde</strong> en el tablón junto al portón de la villa.</li>
          <li>Habla con la <strong>aldeana</strong> junto al pozo de la plaza. Si vuelves a hablarle después de aceptar su ayuda, te dice qué hacer ahora. Lo mismo hacen Imeri, el elfo y Hedrig: una vez aceptas su ayuda, al volver te indican el siguiente paso.</li>
          <li>Sigue el camino hasta la casa de <strong>Imeri</strong>, la cazadora. Dentro hay siete cosas para recoger.</li>
          <li>Cruza el pantano. Allí hay un gigante de piedra, mosquitos enormes y pozos de lodo: cada objeto de la mochila sirve para uno de ellos.</li>
        </ol>
        <h3 className={H3}>Desafío 2: Valle del Elfo y Bosque de la Oscuridad</h3>
        <ol className={OL}>
          <li>Al pie del árbol gigante te espera el <strong>elfo</strong>. Su casa está en la copa: sube por la escalera.</li>
          <li>En el bosque hay duendes que atacan en grupo. Además te da <strong>hambre</strong>: la barra baja con el tiempo.</li>
          <li>No todas las frutas del bosque son buenas. Uno de los objetos te deja ver cuáles puedes comer.</li>
          <li>Para salir del bosque necesitas encontrar el sendero: otro objeto te lo muestra.</li>
        </ol>
        <h3 className={H3}>Desafío 3: Pueblo de Hedrig y Túneles de la Cumbre</h3>
        <ol className={OL}>
          <li>En el pueblo minero vive <strong>Hedrig</strong>. Escucha su historia: te dice para qué sirve cada cosa.</li>
          <li>Dentro de la mina las galerías se cruzan. Uno de los objetos te marca el camino.</li>
          <li>En los túneles hay alguien que no quiere pelear: quiere recuperar algo que perdió.</li>
          <li>Al final un guardián cuida la escalera. Se le gana en un juego de fuerza, haciendo clic muy rápido, y con la mano bien protegida.</li>
        </ol>
        <h3 className={H3}>Cierre: la Cumbre y el Santuario</h3>
        <p className={P}>En la cumbre te recibe la guardiana del santuario. Escúchala, entra y toma el cáliz del altar. El juego termina con una escena final y un resumen de tu recorrido.</p>
        <h3 className={H3}>Dos tareas opcionales</h3>
        <p className={P}>
          A la salida del pantano y a la salida del bosque hay dos encuentros escondidos que no son obligatorios. Cada uno se resuelve con paciencia,
          en tres pasos, y entrega una <strong>estrella extra</strong> que te protege de un bajo rendimiento.
        </p>
      </>
    ),
  },
  {
    id: 'perfil',
    title: '11. Tu perfil y tu avance',
    body: (
      <>
        <ul className={UL}>
          <li>
            Tu retrato, arriba a la derecha, abre el <strong>perfil</strong>: tu personaje, tu registro académico y el nombre de tu aventurero, que es lo
            único que puedes cambiar (se guarda solo).
          </li>
          <li>
            El avance se <strong>guarda automáticamente</strong> cada vez que logras algo. Al volver a entrar apareces en el último punto de control:
            normalmente, frente a la casa de quien te ayuda en ese desafío.
          </li>
          <li>
            <strong>Salir</strong> cierra tu sesión. Úsalo siempre en computadores compartidos.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'problemas',
    title: '12. Si algo no funciona',
    body: (
      <>
        <Tabla
          head={['Qué pasa', 'Qué hacer']}
          rows={[
            ['No puedo iniciar sesión', 'Verifica que estés usando la cuenta @correounivalle.edu.co y que el navegador permita ventanas emergentes para este sitio.'],
            ['La carga se queda quieta', 'Espera un momento: en celular puede tardar un par de minutos la primera vez. Si no avanza, recarga la página; tu avance no se pierde.'],
            ['Veo «Gira tu celular» y no cambia', 'Tu teléfono tiene bloqueado el giro de la pantalla. Sigue los pasos que muestra el aviso (iPhone o Android) y gíralo a horizontal.'],
            ['El juego va lento', 'Cierra otras pestañas y aplicaciones. En computador, usa Chrome o Edge actualizados.'],
            ['No escucho nada', 'Revisa el panel de sonido del juego (ícono del parlante) y el volumen del equipo. En celular, quita el modo silencio.'],
            ['No sé a dónde ir', 'Abre la mochila para leer tu objetivo y mira el punto dorado del minimapa.'],
            ['Una puerta no abre', 'Esa casa se abre cuando aceptas la ayuda de su dueño. Vuelve a hablar con el personaje que te envió.'],
            ['Quedé atrapado en un pozo', 'Se sale con uno de los objetos del primer desafío. Si no lo llevas, no hay salida: por eso conviene recogerlos todos.'],
            ['La pantalla quedó en negro o con un error gráfico', 'Recarga la página. El juego recuerda el problema y la próxima vez usa un modo gráfico más compatible.'],
          ]}
        />
        <p className={P}>
          Si el problema continúa, escribe a DEXIA (<em>dexia@correounivalle.edu.co</em>) contando qué estabas haciendo, en qué equipo y en qué navegador.
        </p>
      </>
    ),
  },
  {
    id: 'admin',
    title: '13. Para administradores de DEXIA',
    body: (
      <>
        <p className={P}>
          Las cuentas administradoras entran por la misma portada y llegan directo al <strong>Panel de Administración</strong>. El panel muestra en vivo el
          avance de los estudiantes, sin recargar la página.
        </p>
        <Figura src="panel" alt="Panel de administración" caption="Panel de administración: indicadores, buscador, filtros y tabla de jugadores." />
        <ul className={UL}>
          <li>
            <strong>Indicadores:</strong> jugadores registrados, cuántos superaron cada misión, cuántos completaron el juego y cuántos obtuvieron cada bono.
          </li>
          <li>
            <strong>Buscar y filtrar:</strong> por nombre, código, correo, nombre de aventurero o programa; por sede y por tipo de usuario.
          </li>
          <li>
            <strong>Ver ficha:</strong> datos académicos, personaje, estrellas, derrotas, personajes perdidos y el paso a paso de cada misión con las
            decisiones que tomó el estudiante.
          </li>
          <li>
            <strong>Exportar CSV:</strong> descarga los registros que estén en pantalla (todos o los filtrados) en un archivo que abre en Excel.
          </li>
          <li>
            <strong>Ver Mundo 3D:</strong> permite al administrador jugar como un estudiante.
          </li>
        </ul>
        <Figura src="ficha" alt="Ficha de un estudiante en el panel" caption="Ficha de un estudiante." />
      </>
    ),
  },
];

// The manual itself: an index (chips on a phone, a side list on a wide screen) and the sections, in a container that
// scrolls on its own (the page body never scrolls in this app).
export function ManualContent({ onClose }: { onClose?: () => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(SECTIONS[0].id);

  const go = (id: string) => {
    scroller.current?.querySelector(`#manual-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setCurrent(id);
  };

  // Highlights in the index the section being read.
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setCurrent(visible.target.id.replace('manual-', ''));
      },
      { root, rootMargin: '0px 0px -65% 0px' },
    );
    root.querySelectorAll('section[id^="manual-"]').forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0 bg-papel-100 text-madera-800">
      <header className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-7 sm:py-3 border-b-2 border-madera-600/20 bg-gradient-to-r from-papel-200 via-papel-50 to-papel-50 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/univalle.svg" alt="Universidad del Valle" className="w-9 h-9 object-contain flex-shrink-0" />
          <div className="min-w-0">
            <span className="block text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-madera-600">Brillo en la montaña</span>
            <h1 id="manual-title" className="font-serif text-lg sm:text-xl font-bold tracking-tight text-madera-900 leading-tight">
              Manual de usuario
            </h1>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar el manual"
            className="w-9 h-9 rounded-full bg-papel-100 hover:bg-papel-300 active:scale-95 text-madera-500 hover:text-madera-800 flex items-center justify-center transition-all flex-shrink-0 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </header>

      {/* Index on a narrow screen: one row of chips that scrolls sideways. */}
      <nav className="md:hidden flex gap-1.5 overflow-x-auto px-3 py-2 border-b border-madera-600/15 bg-papel-200/60 flex-shrink-0" aria-label="Contenido del manual">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => go(section.id)}
            className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-semibold border transition cursor-pointer ${
              current === section.id ? 'bg-madera-600 text-oro-400 border-madera-800' : 'bg-papel-50 text-madera-600 border-papel-400'
            }`}
          >
            {section.title}
          </button>
        ))}
      </nav>

      <div className="flex flex-1 min-h-0">
        <nav className="hidden md:block w-64 flex-shrink-0 overflow-y-auto border-r-2 border-madera-600/15 bg-papel-200/50 p-3" aria-label="Contenido del manual">
          <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-wider text-carmesi font-serif">Contenido</p>
          <ul className="space-y-0.5">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => go(section.id)}
                  aria-current={current === section.id ? 'true' : undefined}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[13px] leading-snug transition cursor-pointer ${
                    current === section.id ? 'bg-madera-600 text-oro-400 font-bold shadow-sm' : 'text-madera-700 hover:bg-papel-300/70'
                  }`}
                >
                  {section.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div ref={scroller} className="flex-1 min-w-0 overflow-y-auto scroll-smooth px-4 py-4 sm:px-8 sm:py-6">
          <div className="max-w-3xl mx-auto">
            {SECTIONS.map((section) => (
              <section key={section.id} id={`manual-${section.id}`} className="pb-6 mb-6 border-b border-madera-600/15 last:border-0 scroll-mt-2">
                <h2 className="font-serif font-bold text-xl sm:text-2xl text-madera-900 mb-3 pb-1 border-b-2 border-oro-600/60 inline-block">{section.title}</h2>
                {section.body}
              </section>
            ))}
            <p className="text-center text-xs text-madera-400 pb-4">
              Dirección de Desarrollo Estudiantil y Éxito Académico (DEXIA) · Universidad del Valle · 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// The manual as a window over whatever screen is open. While it is open the game takes no keys (the arrows scroll
// the manual instead of walking the avatar) and Esc closes it.
export function ManualModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    useUIStore.getState().setManualOpen(true);
    const onKey = (event: KeyboardEvent) => {
      event.stopImmediatePropagation();
      if (event.type === 'keydown' && event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    return () => {
      useUIStore.getState().setManualOpen(false);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKey, true);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-madera-900/70"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-title"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-5xl h-[calc(100dvh-1rem)] sm:h-[calc(100dvh-2rem)] rounded-2xl sm:rounded-3xl border-2 sm:border-[3px] border-madera-600 shadow-2xl overflow-hidden"
      >
        <ManualContent onClose={onClose} />
      </div>
    </div>,
    document.body,
  );
}

const BUTTON_STYLES = {
  // Round icon button for the top-right bar of the game (next to the sound and the backpack).
  icon: 'flex items-center justify-center w-8 h-8 rounded-full text-madera-700 hover:scale-110 active:scale-95 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-madera-600',
  // Text link under the sign-in button.
  link: 'inline-flex items-center gap-2 text-sm font-semibold text-madera-600 hover:text-madera-800 underline decoration-oro-600 decoration-2 underline-offset-4 cursor-pointer transition',
  // Button of the dark header of the admin dashboard.
  header:
    'h-9 min-w-9 px-2 sm:px-3.5 rounded-xl border border-madera-500 text-papel-100 hover:bg-madera-600 text-sm font-medium flex items-center justify-center gap-2 transition cursor-pointer',
} as const;

function BookIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2z" />
      <path d="M12 6.5v13" />
    </svg>
  );
}

// Opens the manual. `onOpen` lets the caller put away what it had open (a game dialog, the backpack).
export function ManualButton({ variant, onOpen }: { variant: keyof typeof BUTTON_STYLES; onOpen?: () => void }) {
  const [open, setOpen] = useState(false);
  const label = 'Manual de usuario';
  return (
    <>
      <button
        type="button"
        onClick={() => {
          onOpen?.();
          setOpen(true);
        }}
        title={label}
        aria-label={label}
        aria-haspopup="dialog"
        className={BUTTON_STYLES[variant]}
      >
        <BookIcon className={variant === 'icon' ? 'w-5 h-5' : 'w-4 h-4'} />
        {variant === 'link' && <span>{label}</span>}
        {variant === 'header' && <span className="hidden md:inline">Manual</span>}
      </button>
      {open && <ManualModal onClose={() => setOpen(false)} />}
    </>
  );
}
