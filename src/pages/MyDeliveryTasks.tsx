import { useEffect, useState } from 'react';
import { Card, Table, Tag, Button, message, Space, Typography, Popconfirm, Upload, Modal, Image } from 'antd';
import { ReloadOutlined, UploadOutlined, CheckOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { fetchMyDeliveryTasks, cancelDeliveryTask, completeDeliveryTask, deleteDeliveryTask, uploadDeliveryImage, type DeliveryTask } from '../services/delivery';
import { PageShell } from '../components/PageShell';
import { palette, statusColorMap } from '../theme/design';
import type { UploadFile } from 'antd';

const { Title, Text } = Typography;

export default function MyDeliveryTasks() {
  const [tasks, setTasks] = useState<DeliveryTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [currentTask, setCurrentTask] = useState<DeliveryTask | null>(null);
  const [uploadType, setUploadType] = useState<'pickup' | 'delivery'>('pickup');
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchMyDeliveryTasks();
      setTasks(data);
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '加载配送任务失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCancel = async (taskId: string) => {
    try {
      await cancelDeliveryTask(taskId);
      message.success('配送任务已取消，重新上架');
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '取消失败');
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await deleteDeliveryTask(taskId);
      message.success('配送任务已删除');
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '删除失败');
    }
  };

  const handleComplete = async (taskId: string) => {
    try {
      await completeDeliveryTask(taskId);
      message.success('配送已完成');
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '完成失败');
    }
  };

  const handleUploadImage = (task: DeliveryTask, type: 'pickup' | 'delivery') => {
    setCurrentTask(task);
    setUploadType(type);
    setUploadModalVisible(true);
    setFileList([]);
  };

  const handleUploadSubmit = async () => {
    if (!currentTask || fileList.length === 0) {
      message.error('请选择图片');
      return;
    }

    const file = fileList[0].originFileObj;
    if (!file) {
      message.error('无效的文件');
      return;
    }

    try {
      await uploadDeliveryImage(currentTask.id, file, uploadType);
      message.success('图片上传成功');
      setUploadModalVisible(false);
      setFileList([]);
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '上传失败');
    }
  };

  const columns: ColumnsType<DeliveryTask> = [
    { title: '取书地点', dataIndex: 'pickup_location', key: 'pickup_location' },
    { title: '送书地点', dataIndex: 'delivery_location', key: 'delivery_location' },
    { title: '配送费', dataIndex: 'delivery_fee', key: 'delivery_fee', render: (v: number) => `¥${v}` },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => <Tag color={statusColorMap[v] || 'default'}>{v}</Tag>,
    },
    {
      title: '取货图片',
      key: 'pickup_image',
      render: (_, record) => (
        record.pickup_image ? (
          <Image src={`http://127.0.0.1:8000${record.pickup_image}`} width={50} height={50} style={{ objectFit: 'cover' }} />
        ) : (
          <Button size="small" icon={<UploadOutlined />} onClick={() => handleUploadImage(record, 'pickup')}>
            上传取货图
          </Button>
        )
      ),
    },
    {
      title: '送达图片',
      key: 'delivery_image',
      render: (_, record) => (
        record.delivery_image ? (
          <Image src={`http://127.0.0.1:8000${record.delivery_image}`} width={50} height={50} style={{ objectFit: 'cover' }} />
        ) : (
          <Button size="small" icon={<UploadOutlined />} onClick={() => handleUploadImage(record, 'delivery')}>
            上传送达图
          </Button>
        )
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          {record.status === 'accepted' && (
            <>
              <Popconfirm title="确定取消配送吗？任务将重新上架" onConfirm={() => handleCancel(record.id)}>
                <Button danger size="small">取消配送</Button>
              </Popconfirm>
              <Popconfirm
                title="确定完成配送吗？请确保已上传取货和送达图片"
                onConfirm={() => handleComplete(record.id)}
              >
                <Button type="primary" size="small" icon={<CheckOutlined />}>
                  配送完成
                </Button>
              </Popconfirm>
            </>
          )}
          {(record.status === 'delivered' || record.status === 'cancelled') && (
            <Popconfirm title="确定删除该配送任务吗？" onConfirm={() => handleDelete(record.id)}>
              <Button danger size="small">删除</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageShell>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space align="center" style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Text style={{ color: palette.muted, textTransform: 'uppercase' }}>My Delivery Tasks</Text>
            <Title level={3} style={{ margin: 0 }}>我的配送订单</Title>
          </div>
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
            刷新
          </Button>
        </Space>

        <Card bordered={false} style={{ borderRadius: 18 }}>
          <Table
            rowKey="id"
            dataSource={tasks}
            columns={columns}
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      </Space>

      <Modal
        title={`上传${uploadType === 'pickup' ? '取货' : '送达'}图片`}
        open={uploadModalVisible}
        onOk={handleUploadSubmit}
        onCancel={() => {
          setUploadModalVisible(false);
          setFileList([]);
        }}
        okText="上传"
        cancelText="取消"
      >
        <Upload
          listType="picture"
          fileList={fileList}
          onChange={({ fileList: newFileList }) => setFileList(newFileList)}
          beforeUpload={() => false}
          maxCount={1}
        >
          <Button icon={<UploadOutlined />}>选择图片</Button>
        </Upload>
        <p style={{ marginTop: 16, color: '#999' }}>
          {uploadType === 'pickup' ? '请上传取货地点的照片' : '请上传送达地点的照片'}
        </p>
      </Modal>
    </PageShell>
  );
}

