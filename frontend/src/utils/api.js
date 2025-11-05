import axios from 'axios';

const API_URL = 'https://j5el2jx4vb.execute-api.us-east-1.amazonaws.com/prod';

export const getUploadUrl = async (fileName, fileType) => {
  const response = await axios.post(`${API_URL}/upload-url`, {
    fileName,
    fileType
  });
  return response.data;
};

export const uploadToS3 = async (url, file) => {
  await axios.put(url, file, {
    headers: { 'Content-Type': file.type }
  });
};

export const analyzeContract = async (contractId, s3Key) => {
  const response = await axios.post(`${API_URL}/analyze`, {
    contractId,
    s3Key
  });
  return response.data;
};

export const getAnalysis = async (contractId) => {
  const response = await axios.get(`${API_URL}/analysis/${contractId}`);
  return response.data;
};