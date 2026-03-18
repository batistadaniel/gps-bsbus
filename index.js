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

    const [data, hora] = dataHora.split(" ");

    return {
      prefixo: veiculo.properties.prefixo,
      // data_hora: veiculo.properties.datalocal,
      data,
      hora,
      sentido: veiculo.properties.velocidade == 0 ? "Ida" : "Volta",
      linha: veiculo.properties.cd_linha,
      latitude: veiculo.properties.latitude,
      longitude: veiculo.properties.longitude,
      programacao: veiculo.properties.sentido
    };
  });

  const fim = performance.now().toFixed(2);

  res.json({
    tempo_execucao: `Tempo de execução: ${fim - inicio} ms`,
    veiculos: veiculosFormatados
  });
});

// iniciando o servidor na porta 3000
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta http://localhost:${PORT}/veiculos`);
});