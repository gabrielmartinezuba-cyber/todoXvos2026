-- Supabase Init Script for todoXvos
-- Run this in the Supabase SQL Editor

-- 1. Create tables
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    match_code TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player1_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    player2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(player1_id, player2_id)
);

CREATE TABLE public.cards (
    id INT PRIMARY KEY,
    titulo TEXT NOT NULL,
    categoria TEXT NOT NULL,
    tipo TEXT NOT NULL,
    descripcion TEXT NOT NULL
);

CREATE TABLE public.game_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    card_id INT REFERENCES public.cards(id),
    player_id UUID REFERENCES public.profiles(id), -- Current owner of the card
    status TEXT DEFAULT 'in_hand', -- in_hand, pending, completed, discarded, bounced
    played_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(match_id, card_id)
);

-- 2. Insert cards data
INSERT INTO public.cards (id, titulo, categoria, tipo, descripcion) VALUES
(1, 'El Pasante', 'Favores y Mimos', 'Reto', 'Por las próximas 2 horas sos mi asistente personal. Me alcanzás el cargador, me traés un vaso de agua, o me preparás algo rico. No hay quejas, es tu trabajo.'),
(2, 'Modo Avión', 'Favores y Mimos', 'Reto', 'Durante la próxima hora, tu celular es lava. Lo dejás en otra habitación. Solo existimos vos, yo y el momento.'),
(3, 'DJ Dictador', 'Favores y Mimos', 'Reto', 'En nuestro próximo viaje en auto (o la próxima hora en casa), yo tengo el control absoluto de la música. Y no, no podés saltar ninguna canción ni quejarte de mi buen gusto.'),
(4, 'Desayuno de Reyes', 'Favores y Mimos', 'Reto', 'Mañana a la mañana te toca a vos. Me tenés que preparar el desayuno y, si es posible, traérmelo a la cama. Sorprendeme.'),
(5, 'Chef Privado', 'Favores y Mimos', 'Reto', 'No hay nada más lindo que verte cocinar y después comerme tu obra maestra. Encontré una receta y quiero que la hagas para nuestra próxima cena. No quiero presionarte, pero mi felicidad depende de esta comida.'),
(6, 'Resaca Real', 'Favores y Mimos', 'Reto', 'Anoche la pasé bomba, pero hoy estoy pagando las consecuencias. Lo único que necesito es que traigas comida rica, que no me hagas pensar demasiado, y me cuides mucho. Un poco de agüita, unos mimos y un analgésico.'),
(7, 'El Aguatero', 'Favores y Mimos', 'Reto', 'Durante mi próximo partido de fútbol (o mientras estoy trabajando concentrado en la compu), sos mi aguatero oficial. Me tenés que alcanzar bebida fresca o algo para picar sin que yo te lo tenga que pedir.'),
(8, 'All Inclusive', 'Favores y Mimos', 'Reto', 'Hoy soy el cerebro detrás de nuestra cita, elijo lo que vamos a hacer, el lugar... todo. Pero hay un pequeño detalle: vos te hacés cargo de la cuenta. Sí, es un toque injusto, pero es una excelente oportunidad para demostrar tu amorcito a través de un billetito.'),
(9, 'Cebador Oficial', 'Favores y Mimos', 'Reto', 'Por el resto de la tarde, vos sos el encargado exclusivo de armar y cebar los mates. Si se lava, la culpa es tuya y hay penalización.'),
(10, 'Limpieza Mágica', 'Favores y Mimos', 'Reto', 'Elegí una tarea de la casa que detesto hacer (lavar los platos, sacar la basura, ordenar el cuarto). Hoy es toda tuya. Te ganás mi gratitud eterna.'),
(11, 'Tarde de Spa', 'Favores y Mimos', 'Reto', 'Hoy te toca ser mi spa personal. Masajes, cremitas en la cara, lo que yo te pida para relajarme. Son solo 20 minutitos de esfuerzo a cambio de tenerme de buen humor todo el día.'),
(12, 'Selección de Película', 'Favores y Mimos', 'Reto', 'Esta noche miramos lo que yo quiero. Película, serie o documental aburrido. Te sentás, mirás la pantalla y no vale quedarse dormido antes de los primeros 15 minutos.'),
(13, 'Chofer Designado', 'Favores y Mimos', 'Reto', 'Para nuestra próxima salida, vos manejás (o pedís y pagás el Uber). Yo me dedico a mirar por la ventana, poner música y disfrutar del viaje.'),
(14, 'Pies en el Cielo', 'Favores y Mimos', 'Reto', 'Sacate los anillos. Tenés 10 minutos para hacerme un masaje en los pies mientras miramos la tele. Prometo que me los lavé.'),
(15, 'Mimo a Pedido', 'Favores y Mimos', 'Reto', 'Guardo esta carta para cuando tenga un día pésimo. Al momento de jugarla, tenés que dejar lo que estás haciendo y darme un abrazo de oso por al menos 2 minutos en absoluto silencio.'),
(16, 'De Reversa Mami', 'Risas y Ridículos', 'Reto', 'Por los próximos 5 minutos, solo podés caminar marcha atrás. No importa dónde estemos ni quién mire. Si te trabás, dudás o intentás hacerte el boludo... te robo una carta.'),
(17, 'No al ''No''', 'Risas y Ridículos', 'Reto', 'Por las próximas 2 horas, la palabra ''no'' está fuera de tu vocabulario. ¿Si me traés algo rico? Sí. ¿Si me hacés un favor? También. Sos pura predisposición... y yo voy a aprovecharlo.'),
(18, 'Amasa la Masa', 'Risas y Ridículos', 'Reto', 'Hoy te toca ser mi spa personal, y no quiero excusas tipo ''no sé hacer masajes''. No es tan difícil: apretá, amasá, y hacé de cuenta que soy una masa de pizza estresada. Son solo 10 minutos.'),
(19, 'Doblaje Trucho', 'Risas y Ridículos', 'Reto', 'Durante los próximos 15 minutos, tu única forma de comunicarte va a ser con la voz de un dibujito. Mickey, un Minion, lo que te salga. Si hablás normal, hay castigo.'),
(20, 'El Robo del Siglo', 'Risas y Ridículos', 'Reto', 'Mirá, no es culpa mía que elegiste mejor que yo. Mi plato no me tienta y el tuyo tiene alta pinta. Así que, por el bien de mi antojo, te robo tu plato y vos te comés el mío.'),
(21, 'Mové el Totó', 'Risas y Ridículos', 'Reto', 'Voy a poner una canción bien fiestera y tenés que bailármela con toda la energía durante al menos un minuto. Con Tuki uno va a pasar el ridículo un rato pero después todo son risas.'),
(22, 'Censura', 'Risas y Ridículos', 'Reto', 'Durante la próxima hora, no podés usar la palabra ''Que''. Si te equivocás y la decís, te robo una carta de tu mano.'),
(23, 'Outfit Sorpresa', 'Risas y Ridículos', 'Reto', 'Para nuestra próxima salida, la ropa que te vas a poner la elijo yo de tu placard. Te guste o no la combinación, te la ponés y salimos así a la calle.'),
(24, 'Relator Estrella', 'Risas y Ridículos', 'Reto', 'Durante los próximos 5 minutos, tenés que relatar absolutamente todo lo que estoy haciendo como si fuera la final en la Bombonera y yo estuviera por patear el penal decisivo. Ponéle pasión.'),
(25, 'Acento Extranjero', 'Risas y Ridículos', 'Reto', 'Elegí un acento (español, mexicano, colombiano). Por los próximos 20 minutos, es tu nueva forma de hablar. Si te sale pésimo, mejor, más me voy a reír.'),
(26, 'Manos Inquietas', 'Risas y Ridículos', 'Reto', 'En nuestra próxima comida (o postre), me tenés que dar de comer en la boca. Yo no puedo usar las manos para nada. Avióncito incluido opcional.'),
(27, 'El Mimo', 'Risas y Ridículos', 'Reto', 'Se te cortó el audio. Por los próximos 15 minutos tu única forma de comunicarte conmigo es haciendo mímica. Suerte intentando explicarme algo.'),
(28, 'Pasarela de Casa', 'Risas y Ridículos', 'Reto', 'Por lo que queda del día, cada vez que cruces el pasillo o entres a una habitación donde estoy yo, tenés que hacerlo caminando como modelo de alta costura y tirando una pose al final.'),
(29, 'Cantante de Ducha', 'Risas y Ridículos', 'Reto', 'Tenés que cantarme el estribillo de tu canción favorita a todo pulmón. No importa si desafinás, lo que evalúo es la actitud.'),
(30, 'Verdad Incómoda', 'Risas y Ridículos', 'Reto', 'Te voy a hacer una pregunta sobre nosotros o sobre vos, y me tenés que responder con la verdad absoluta, sin filtro y mirándome a los ojos.'),
(31, 'Regalo Sorpresa', 'Conexión y Románticas', 'Reto', 'En las próximas 48 horas, tenés que sorprenderme con un pequeño regalo. No importa el valor monetario, importa el gesto. Un chocolate, una flor, una notita... lo que sea, pero inesperado.'),
(32, 'Brindis Obligatorio', 'Conexión y Románticas', 'Reto', 'Estamos comiendo tranquilos, pero tengo ganas de un momento especial. Te toca levantar la copa y hacer un brindis por mí. Quiero palabras lindas, amorosas y que se note lo mucho que me amás.'),
(33, 'Ladrón de Besos', 'Conexión y Románticas', 'Reto', 'Por la próxima hora, tu misión es sorprenderme con 5 besos cuando menos lo espere. Que no sea obvio. Puede ser mientras lavo los platos o cuando esté haciendo algo nada que ver.'),
(34, 'Hobby-Landia', 'Conexión y Románticas', 'Reto', 'Tuki te obliga a hacer actividades que al otro le gustan. Me tenés que acompañar por una hora en mi hobby favorito con la mejor de las ondas, aunque no entiendas nada del tema.'),
(35, 'Máquina del Tiempo', 'Conexión y Románticas', 'Reto', 'Esta semana tenemos que recrear, lo mejor posible, lo que hicimos en nuestra primera cita hace ya una década. Mismo plan, misma onda, como si nos estuviendo conociendo recién.'),
(36, 'Cuestionario de a dos', 'Conexión y Románticas', 'Reto', 'Frenamos lo que estamos haciendo. Me tenés que hacer 3 preguntas sobre mí que nunca me hayas hecho, y yo a vos. Prohibido responder con monosílabos.'),
(37, 'Sobredosis de Halagos', 'Conexión y Románticas', 'Reto', 'Durante todo el día de hoy, cada vez que nuestros ojos se crucen, me tenés que decir un halago distinto. Ponete creativo/a, no vale repetir.'),
(38, 'Carta a la Antigua', 'Conexión y Románticas', 'Reto', 'Agarrá papel y lapicera. Tenés hasta mañana a la noche para escribirme una carta de amor de puño y letra y dejármela escondida en algún lugar donde la encuentre de sorpresa.'),
(39, 'Noche de Vinos y Charlas', 'Conexión y Románticas', 'Reto', 'Esta noche descorchamos algo (o preparamos un buen café/mate) y apagamos las pantallas. Solo charlar nosotros dos de la vida por al menos una hora.'),
(40, 'Mirada Fija', 'Conexión y Románticas', 'Reto', 'Poné un cronómetro de 2 minutos. Tenemos que mirarnos a los ojos sin desviar la mirada y sin hablar. El que se ríe primero, pierde y debe un masaje.'),
(41, '10 Razones', 'Conexión y Románticas', 'Reto', 'Frená todo. Mirame a los ojos y decime 10 razones por las que me elegís todos los días. Tienen que ser de corrido.'),
(42, 'Baile Lento', 'Conexión y Románticas', 'Reto', 'Elegí una canción romántica, ponela a todo volumen en el living y sacame a bailar. Sin vergüenza, solo nosotros dos.'),
(43, 'Álbum de los Recuerdos', 'Conexión y Románticas', 'Reto', 'Tirémonos en el sillón. Vamos a pasar los próximos 20 minutos scrolleando fotos viejas nuestras en el celular recordando anécdotas y viajes.'),
(44, 'Plan de Fuga', 'Conexión y Románticas', 'Reto', 'Tenés exactamente una semana para planear una salida sorpresa para nosotros. Vos armás el itinerario, yo solo me dejo llevar.'),
(45, 'Espejito Rebotón', 'Comodines', 'Comodín', '¡Zafaste! Anulás el reto que te acabo de tirar, ¡pero se te devuelve a vos! Ahora el que tiene que cumplir esa misma carta soy yo.'),
(46, 'Hoy no, mañana sí', 'Comodines', 'Comodín', 'Pausás la carta que te jugué. Zafaste por hoy, pero la carta queda activa y me la podés volver a exigir que la cumpla en cualquier momento de la semana sin previo aviso.'),
(47, 'Veto Absoluto', 'Comodines', 'Comodín', 'Esta carta muere acá. No la hacés vos y no la hago yo. Se descarta para siempre al pozo de las cartas muertas.'),
(48, 'Negociador Experto', 'Comodines', 'Comodín', 'No rechazás el reto, pero tenés derecho a cambiar una sola condición de la carta que te jugué (por ejemplo, reducir el tiempo a la mitad, o cambiar la comida elegida).'),
(49, 'Robo a Mano Armada', 'Comodines', 'Comodín', 'Anulás mi carta, pero además te cobrás peaje: tenés derecho a robarme una carta al azar de mi mano (oculta) y sumarla a la tuya.'),
(50, 'Escudo Protector', 'Comodines', 'Comodín', 'Al activar esta carta, la carta que me tiraste se anula y, además, quedo inmune a cualquier otro reto por las próximas 24 horas. Modo intocable activado.');

-- 3. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_state ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles (needed for match creation), but only update their own
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Matches: users can read and insert matches they belong to
CREATE POLICY "Users can view their own matches" ON public.matches FOR SELECT USING (auth.uid() = player1_id OR auth.uid() = player2_id);
CREATE POLICY "Users can insert matches" ON public.matches FOR INSERT WITH CHECK (auth.uid() = player1_id OR auth.uid() = player2_id);
CREATE POLICY "Users can update their own matches" ON public.matches FOR UPDATE USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Cards: everyone can read
CREATE POLICY "Cards are viewable by everyone" ON public.cards FOR SELECT USING (true);

-- Game State: users can read and update game state for their matches
CREATE POLICY "Users can view game state of their matches" ON public.game_state FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.matches m 
        WHERE m.id = game_state.match_id 
        AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid())
    )
);
CREATE POLICY "Users can insert game state for their matches" ON public.game_state FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.matches m 
        WHERE m.id = game_state.match_id 
        AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid())
    )
);
CREATE POLICY "Users can update game state of their matches" ON public.game_state FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.matches m 
        WHERE m.id = game_state.match_id 
        AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid())
    )
);

-- Enable Realtime for game_state
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_state;
