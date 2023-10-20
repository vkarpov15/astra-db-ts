import axios, { AxiosRequestConfig } from "axios";

export interface AstraClientConfig {
  token: string;
  databaseId: string;
  databaseRegion: "us-east1" | "us-west-2" | "eu-central-1";
  keyspace?: string;
}

export class Astra {
  private config: AstraClientConfig;
  private apiBase: string;
  private readonly requestOptions: AxiosRequestConfig;

  constructor(options: AstraClientConfig) {
    this.config = options;
    this.apiBase = `https://${this.config.databaseId}-${this.config.databaseRegion}.apps.astra.datastax.com/api/json/v1`;
    this.requestOptions = {
      headers: {
        "X-Cassandra-Token": this.config.token,
      },
    };
  }

  public createNamespace = async (name: string) => {
    const response = await axios.post(
      `${this.apiBase}`,
      {
        createNamespace: {
          name,
        },
      },
      this.requestOptions,
    );
    return response?.data;
  };

  public findNamespaces = async () => {
    const response = await axios.post(
      `${this.apiBase}`,
      {
        findNamespaces: {},
      },
      this.requestOptions,
    );
    return response?.data;
  };

  public dropNamespace = async (name: string) => {
    const response = await axios.post(
      `${this.apiBase}`,
      {
        dropNamespace: {
          name,
        },
      },
      this.requestOptions,
    );
    return response?.data;
  };

  public createCollection = async (namespace: string, name: string) => {
    const response = await axios.post(
      `${this.apiBase}/${namespace}`,
      {
        createCollection: {
          name,
        },
      },
      this.requestOptions,
    );
    return response?.data;
  };
  public findCollections = async (namespace: string) => {
    const response = await axios.post(
      `${this.apiBase}/${namespace}`,
      {
        findCollections: {},
      },
      this.requestOptions,
    );
    return response?.data;
  };

  public deleteCollection = async (namespace: string, name: string) => {
    const response = await axios.post(
      `${this.apiBase}/${namespace}`,
      {
        deleteCollection: {
          name,
        },
      },
      this.requestOptions,
    );
    return response?.data;
  };
}