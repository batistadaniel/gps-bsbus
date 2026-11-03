// importando exxpress para construir o servidor e as rotas
import express from "express";
// permite acesso de diferentes origens
import cors from "cors";
// para medir o tempo de execucao
import { performance } from 'perf_hooks';


// criando a instância do express
const PORT = 3000;
const app = express();
app.use(cors());
app.use(express.json());
app.use("/veiculos", async (req, res) => {
  const inicio = performance.now();

  const url = 'https://geoserver.semob.df.gov.br/geoserver/semob/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=semob%3Aultima_posicao&outputFormat=application%2Fjson&cql_filter=id_operadora=3450';

  const response = await fetch(url);
  const data = await response.json();

  const veiculosFormatados = data.features.map((veiculo) => {
    const dataHora = veiculo.properties.datalocal;
    const dataHoraProgramada = veiculo.properties.sentido;

    const [data, hora] = dataHora.split(" ");
    const [dataProgramada, horaProgramada] = dataHoraProgramada.split(" ");

    const [ano, mes, dia] = data.split("-");
    const dataBR = `${dia}/${mes}/${ano}`;

    return {
      prefixo: veiculo.properties.prefixo,
      // data_hora: veiculo.properties.datalocal,
      data: dataBR,
      hora,
      dataProgramada,
      horaProgramada,
      sentido: veiculo.properties.velocidade == 0 ? "Ida" : "Volta",
      linha: veiculo.properties.cd_linha,
      direcao: veiculo.properties.direcao, // adicionando comentario na linha da propriedade direcao pra ver se funciona em producao
      latitude: veiculo.properties.latitude,
      longitude: veiculo.properties.longitude,
      // programacao: veiculo.properties.sentido
    };
  });

  const fim = performance.now().toFixed(2);

  res.json({
    tempo_execucao: `Tempo de execução: ${(fim - inicio).toFixed(2)} ms`,
    veiculos_total: veiculosFormatados.length,
    veiculos: veiculosFormatados
  });
});

app.use("/itinerario/:linha", async (req, res) => {
  try {
    const { linha } = req.params;

    // 1. Buscar rotas
    const routesRes = await fetch("https://mobilibus.com/api/routes?origin=web&project_id=313");
    const routes = await routesRes.json();

    // 2. Encontrar a linha pelo shortName
    const route = routes.find(r => r.shortName === linha);

    if (!route) {
      return res.status(404).json({ erro: "Linha não encontrada" });
    }

    const routeId = route.routeId;

    // 3. Buscar timetable
    const timetableRes = await fetch(
      `https://mobilibus.com/api/timetable?origin=web&v=2&project_id=313&route_id=${routeId}`
    );
    const timetableData = await timetableRes.json();

    const trips = timetableData.timetable?.trips || [];

    if (trips.length === 0) {
      return res.status(404).json({ erro: "Nenhum itinerário encontrado" });
    }

    // 4. Buscar detalhes de cada trip
    const detalhesTrips = await Promise.all(
      trips.map(async (trip) => {
        const tripRes = await fetch(
          `https://mobilibus.com/api/trip-details?origin=web&v=2&trip_id=${trip.tripId}`
        );
        const tripData = await tripRes.json();

        return {
          tripId: trip.tripId,
          directionId: trip.directionId,
          nome: tripData.tripName,
          shape: tripData.shape,
          stops: tripData.stops
        };
      })
    );

    // 5. Retornar tudo organizado
    return res.json({
      linha: route.shortName,
      nome: route.longName,
      price: route.price,
      itinerarios: detalhesTrips
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro interno" });
  }
});

// iniciando o servidor na porta 3000
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta http://localhost:${PORT}`);
});
